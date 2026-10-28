'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useTheme } from '@/hooks/useTheme';

/**
 * Gooey current-item pill for the desktop bottom bar, adapted from React Bits
 * (reactbits.dev, GooeyNav) with its look: a bright pill whose text turns dark, which
 * on navigation breaks into droplets that flow to the new item and merge with a
 * wobble, plus a soft gooey hover highlight. Instead of rendering its own list it
 * sits behind the bar's items (`[data-gooey]`); an inert, aria-hidden copy of their
 * labels in the pill ink is clipped to the exact blob shape every frame, as in the
 * source. WebGL2 with a CSS fallback: without WebGL or after a lost context, a plain
 * sliding pill takes over, so there is never a blank canvas.
 */

const MAX_DROPS = 32;
const MAX_PILLS = 4;
const MARGIN = 72;
const DESKTOP = '(min-width: 48rem)';

/** GooeyNav's defaults (dark theme). */
const SETTINGS = {
  animationTime: 600,
  particleCount: 15,
  timeVariance: 300,
  spread: 56,
  gooeyness: 0.5,
  wobble: 0.5,
  hoverRgba: [1, 1, 1, 0.08] as const,
  shadow: 0.4,
};

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uSize;
uniform float uRatio;
uniform vec4 uPills[${MAX_PILLS.toString()}];
uniform vec4 uHover;
uniform vec4 uDrops[${MAX_DROPS.toString()}];
uniform vec2 uTails[${MAX_DROPS.toString()}];
uniform int uCount;
uniform float uSmooth;
uniform vec3 uPill;
uniform vec4 uHoverColor;
uniform float uShadow;

out vec4 outColor;

float sdPill(vec2 p, vec4 box) {
  vec2 extent = max(box.zw, vec2(0.0));
  float r = min(extent.x, extent.y);
  vec2 q = abs(p - box.xy) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float field(vec2 p) {
  float d = 1e5;
  for (int i = 0; i < ${MAX_PILLS.toString()}; i++) {
    vec4 pill = uPills[i];
    if (pill.z <= 0.0) continue;
    d = smin(d, sdPill(p, pill), uSmooth);
  }
  for (int i = 0; i < ${MAX_DROPS.toString()}; i++) {
    if (i >= uCount) break;
    vec4 drop = uDrops[i];
    if (drop.z <= 0.0) continue;
    float c = sdCapsule(p, drop.xy, drop.xy - uTails[i], drop.z);
    if (c > d + uSmooth) continue;
    d = smin(d, c, uSmooth);
  }
  return d;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio;
  float d = field(p);
  float aa = max(fwidth(d), 0.35);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);

  vec2 grad = vec2(dFdx(d), -dFdy(d));
  vec2 n = length(grad) > 0.0001 ? normalize(grad) : vec2(0.0, 1.0);
  float rim = (1.0 - smoothstep(0.0, 1.6, -d)) * max(0.0, -n.y) * 0.3;
  vec3 fill = mix(uPill, vec3(1.0), rim) * (1.0 - 0.06 * max(0.0, n.y) * (1.0 - smoothstep(0.0, 6.0, -d)));

  float lifted = field(p - vec2(0.0, 3.0));
  float shadow = (1.0 - smoothstep(-3.0, 9.0, lifted)) * uShadow * (1.0 - body);

  float hover = clamp(0.5 - sdPill(p, uHover) / aa, 0.0, 1.0) * uHoverColor.a;

  vec4 color = vec4(0.0, 0.0, 0.0, shadow);
  color = vec4(uHoverColor.rgb * hover, hover) + color * (1.0 - hover);
  color = vec4(fill * body, body) + color * (1.0 - body);
  outColor = color;
}
`;

const UNIFORM_NAMES = [
  'uSize',
  'uRatio',
  'uPills',
  'uHover',
  'uDrops',
  'uTails',
  'uCount',
  'uSmooth',
  'uPill',
  'uHoverColor',
  'uShadow',
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

interface Pipeline {
  readonly program: WebGLProgram;
  readonly uniforms: Record<UniformName, WebGLUniformLocation | null>;
  readonly buffer: WebGLBuffer;
  readonly position: number;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Centre and half extents, as the shader and the outline tracer use them. */
interface Box {
  readonly cx: number;
  readonly cy: number;
  readonly hw: number;
  readonly hh: number;
}

interface Blob {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly tx: number;
  readonly ty: number;
}

interface PillState {
  mass: number;
  scale: number;
  velocity: number;
  outgoing: number;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  readonly size: number;
  given: number;
  readonly source: number;
  index: number;
  readonly leave: number;
  emerged: number;
  absorbed: number;
  state: 'waiting' | 'flying' | 'absorbing';
  start: number;
  duration: number;
  path: [number, number, number, number, number, number, number, number];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const travelEase = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

const bezier = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/** SVG path of a stadium (fully rounded) rectangle. */
function pillPath(x: number, y: number, w: number, h: number): string {
  if (w <= 0.5 || h <= 0.5) return '';
  const r = Math.min(w, h) / 2;
  const n = (v: number) => v.toFixed(2);
  return `M${n(x + r)},${n(y)}H${n(x + w - r)}A${n(r)},${n(r)} 0 0 1 ${n(x + w)},${n(y + r)}V${n(y + h - r)}A${n(r)},${n(r)} 0 0 1 ${n(x + w - r)},${n(y + h)}H${n(x + r)}A${n(r)},${n(r)} 0 0 1 ${n(x)},${n(y + h - r)}V${n(y + r)}A${n(r)},${n(r)} 0 0 1 ${n(x + r)},${n(y)}Z`;
}

/** `#rrggbb` (or `#rgb`) to 0–1 RGB; white when unparseable. */
function parseHex(value: string): [number, number, number] {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  const digits = match?.[1];
  if (!digits) return [1, 1, 1];
  const hex = digits.length === 3 ? digits.replace(/./g, (d) => d + d) : digits;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function build(gl: WebGL2RenderingContext): Pipeline | null {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, FRAGMENT],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = Object.fromEntries(
    UNIFORM_NAMES.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<UniformName, WebGLUniformLocation | null>;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  return { program, uniforms, buffer, position: gl.getAttribLocation(program, 'aPosition') };
}

function subscribeDesktop(onChange: () => void): () => void {
  const media = window.matchMedia(DESKTOP);
  media.addEventListener('change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
  };
}

const isDesktop = () => window.matchMedia(DESKTOP).matches;

interface Engine {
  go(index: number): void;
  refresh(): void;
}

/** The bar items the pill can sit on. */
const gooeyItems = (host: Element) => Array.from(host.querySelectorAll('[data-gooey]'));

/** The visible control inside an item (the link, or the "More" summary). */
const itemControl = (item: Element) => item.querySelector('a, summary') ?? item;

/** Index of the item whose link is the current page (or "More" holding it), else -1. */
function currentIndex(items: readonly Element[]): number {
  return items.findIndex((item) => item.querySelector('[aria-current="page"], [data-current]'));
}

export function GooeyHighlight() {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false);
  return desktop ? <GooeyLayer /> : null;
}

function GooeyLayer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const pathname = usePathname();
  const [theme] = useTheme();

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    const overlay = overlayRef.current;
    const host = stage?.parentElement;
    if (!stage || !canvas || !fallback || !overlay || !host) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    let pipeline = gl ? build(gl) : null;

    const showFallback = (on: boolean) => {
      fallback.style.display = on ? 'block' : 'none';
      canvas.style.display = on ? 'none' : 'block';
    };
    showFallback(!pipeline);

    const view = { width: 0, height: 0 };
    let rects: Rect[] = [];
    let target = -1;
    let pillRgb = parseHex(getComputedStyle(host).getPropertyValue('--color-nav-pill'));
    const pills = new Map<number, PillState>();
    const drops: Drop[] = [];
    const hover = { x: 0, y: 0, w: 0, h: 0, alpha: 0, index: -1 };
    const pillData = new Float32Array(MAX_PILLS * 4);
    const dropData = new Float32Array(MAX_DROPS * 4);
    const tailData = new Float32Array(MAX_DROPS * 2);
    let raf = 0;
    let last = 0;
    let disposed = false;

    /** Copies of the item labels in the pill ink, at the same positions (the overlay). */
    const copyLabels = (items: readonly Element[]) => {
      overlay.replaceChildren(
        ...items.map((item, index) => {
          const rect = rects[index];
          const slot = document.createElement('div');
          slot.style.cssText = rect
            ? `position:absolute;left:${rect.x.toString()}px;top:${rect.y.toString()}px;width:${rect.w.toString()}px;height:${rect.h.toString()}px;display:flex`
            : 'display:none';
          const copy = itemControl(item).cloneNode(true) as HTMLElement;
          copy.removeAttribute('href');
          copy.removeAttribute('id');
          copy.style.width = '100%';
          slot.append(copy);
          return slot;
        }),
      );
    };

    const measure = () => {
      const box = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      view.width = box.width;
      view.height = box.height;
      const outerWidth = box.width + MARGIN * 2;
      const outerHeight = box.height + MARGIN * 2;
      Object.assign(canvas.style, {
        left: `${(-MARGIN).toString()}px`,
        top: `${(-MARGIN).toString()}px`,
        width: `${outerWidth.toString()}px`,
        height: `${outerHeight.toString()}px`,
      });
      const width = Math.max(1, Math.round(outerWidth * ratio));
      const height = Math.max(1, Math.round(outerHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const items = gooeyItems(host);
      rects = items.map((item) => {
        const rect = itemControl(item).getBoundingClientRect();
        return { x: rect.left - box.left, y: rect.top - box.top, w: rect.width, h: rect.height };
      });
      copyLabels(items);
    };

    /** Outline of the gooey shape as horizontal 1px strips (the source's CPU tracer). */
    const trace = (boxes: readonly Box[], blobs: readonly Blob[], smooth: number): string => {
      const field = (x: number, y: number) => {
        let d = 1e5;
        const merge = (value: number) => {
          const h = clamp01(0.5 + (0.5 * (value - d)) / smooth);
          d = value + (d - value) * h - smooth * h * (1 - h);
        };
        for (const box of boxes) {
          const r = Math.min(box.hw, box.hh);
          const qx = Math.abs(x - box.cx) - box.hw + r;
          const qy = Math.abs(y - box.cy) - box.hh + r;
          merge(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
        }
        for (const blob of blobs) {
          const px = x - blob.x;
          const py = y - blob.y;
          const bx = -blob.tx;
          const by = -blob.ty;
          const span = bx * bx + by * by;
          const h = span > 0.0001 ? clamp01((px * bx + py * by) / span) : 0;
          const value = Math.hypot(px - bx * h, py - by * h) - blob.r;
          if (value > d + smooth) continue;
          merge(value);
        }
        return d;
      };
      const step = 2;
      const parts: string[] = [];
      for (let y = 0; y < view.height; y += 1) {
        const cy = y + 0.5;
        let previous = field(0, cy);
        let start: number | null = previous < 0 ? 0 : null;
        for (let x = step; x <= view.width + step; x += step) {
          const value = field(Math.min(x, view.width), cy);
          if (previous < 0 !== value < 0) {
            const cross = x - step + (step * previous) / (previous - value);
            if (value < 0) start = cross;
            else if (start !== null) {
              parts.push(
                `M${start.toFixed(1)},${y.toString()}H${cross.toFixed(1)}V${(y + 1).toString()}H${start.toFixed(1)}Z`,
              );
              start = null;
            }
          }
          previous = value;
        }
        if (start !== null) {
          parts.push(
            `M${start.toFixed(1)},${y.toString()}H${view.width.toString()}V${(y + 1).toString()}H${start.toFixed(1)}Z`,
          );
        }
      }
      return parts.join('');
    };

    const pill = (index: number): PillState => {
      let state = pills.get(index);
      if (!state) {
        state = { mass: 0, scale: 0, velocity: 0, outgoing: 0 };
        pills.set(index, state);
      }
      return state;
    };

    const shape = (index: number, amount: number): Rect | null => {
      const rect = rects[index];
      if (!rect || amount <= 0.002) return null;
      const h = rect.h * Math.min(1.08, 0.42 + 0.58 * Math.sqrt(Math.max(0, amount)));
      const w = Math.max(h, rect.w * Math.max(0, amount) ** 0.75);
      return { x: rect.x + rect.w / 2 - w / 2, y: rect.y + rect.h / 2 - h / 2, w, h };
    };

    const plan = (drop: Drop, index: number, now: number, fresh: boolean) => {
      const rect = rects[index];
      if (!rect) return;
      const reach = SETTINGS.spread;
      const ex = rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.45;
      const ey = rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.2;
      const base = SETTINGS.animationTime / 1000;
      const variance = (Math.random() - 0.5) * (SETTINGS.timeVariance / 1000);
      const duration = Math.max(0.15, base * (0.62 + Math.random() * 0.32) + variance * 0.6);
      const out = Math.random() * Math.PI * 2;
      const into = Math.random() * Math.PI * 2;
      const burst = reach * (0.7 + Math.random() * 0.6);
      const swing = reach * (0.55 + Math.random() * 0.55);
      const carry = Math.min(duration / 3, 0.12);
      drop.index = index;
      drop.start = now;
      drop.duration = duration;
      drop.path = [
        drop.x,
        drop.y,
        fresh ? drop.x + Math.cos(out) * burst * 1.6 : drop.x + drop.vx * carry,
        fresh ? drop.y + Math.sin(out) * burst * 1.6 : drop.y + drop.vy * carry,
        ex + Math.cos(into) * swing * 1.5,
        ey + Math.sin(into) * swing * 1.5,
        ex,
        ey,
      ];
    };

    const emit = (from: number, to: number, now: number) => {
      const source = pills.get(from);
      const rect = rects[from];
      if (!source || !rect || !rects[to]) return;
      const available = source.mass - source.outgoing;
      if (available <= 0.002) return;
      const room = MAX_DROPS - drops.length;
      const count = Math.min(room, Math.max(1, Math.round(SETTINGS.particleCount * available)));
      if (count <= 0) return;
      const spreadWindow = (SETTINGS.animationTime / 1000) * 0.16;
      for (let i = 0; i < count; i += 1) {
        const mass = available / count;
        source.outgoing += mass;
        const x = rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.6;
        const y = rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.3;
        drops.push({
          x,
          y,
          vx: 0,
          vy: 0,
          mass,
          size: 0.8 + Math.random() * 0.4,
          given: 0,
          source: from,
          index: to,
          leave: now + Math.random() * spreadWindow * 1000,
          emerged: 0,
          absorbed: 0,
          state: 'waiting',
          start: now,
          duration: 0.5,
          path: [x, y, x, y, x, y, x, y],
        });
      }
    };

    const render = (): void => {
      const height = rects[target]?.h ?? rects[0]?.h ?? 40;
      const smooth = height * (0.18 + 0.5 * clamp01(SETTINGS.gooeyness));
      const boxes: Box[] = [];
      const blobs: Blob[] = [];
      for (const [index, state] of pills) {
        const box = shape(index, state.scale);
        if (box)
          boxes.push({
            cx: box.x + box.w / 2,
            cy: box.y + box.h / 2,
            hw: box.w / 2,
            hh: box.h / 2,
          });
      }
      for (const drop of drops) {
        if (drop.state === 'waiting') continue;
        const radius = 0.26 * height * drop.size * Math.min(drop.emerged, 1 - drop.absorbed);
        if (radius <= 0.05) continue;
        const speed = Math.hypot(drop.vx, drop.vy);
        const length = Math.min(radius * 1.1, speed * 0.018);
        blobs.push({
          x: drop.x,
          y: drop.y,
          r: radius,
          tx: speed > 0.01 ? (drop.vx / speed) * length : 0,
          ty: speed > 0.01 ? (drop.vy / speed) * length : 0,
        });
      }

      // Dark label copies show exactly where the pill (or a droplet) covers them.
      const settled = boxes.length === 1 && blobs.length === 0;
      const only = boxes[0];
      let clip = 'M0,0Z';
      if (pipeline && settled && only) {
        clip = pillPath(only.cx - only.hw, only.cy - only.hh, only.hw * 2, only.hh * 2) || clip;
      } else if (pipeline && boxes.length + blobs.length > 0) {
        clip = trace(boxes, blobs, smooth) || clip;
      } else if (!pipeline) {
        const box = shape(target, 1);
        if (box) clip = pillPath(box.x, box.y, box.w, box.h);
      }
      overlay.style.clipPath = `path('${clip}')`;
      overlay.style.visibility = 'visible';

      if (!pipeline || !gl) {
        const box = shape(target, 1);
        if (box) {
          fallback.style.transform = `translate(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px)`;
          fallback.style.width = `${box.w.toString()}px`;
          fallback.style.height = `${box.h.toString()}px`;
        }
        fallback.style.opacity = box ? '1' : '0';
        return;
      }

      let slot = 0;
      for (const box of boxes) {
        if (slot >= MAX_PILLS) break;
        pillData[slot * 4] = box.cx + MARGIN;
        pillData[slot * 4 + 1] = box.cy + MARGIN;
        pillData[slot * 4 + 2] = box.hw;
        pillData[slot * 4 + 3] = box.hh;
        slot += 1;
      }
      pillData.fill(0, slot * 4);
      let count = 0;
      for (const blob of blobs) {
        if (count >= MAX_DROPS) break;
        dropData[count * 4] = blob.x + MARGIN;
        dropData[count * 4 + 1] = blob.y + MARGIN;
        dropData[count * 4 + 2] = blob.r;
        dropData[count * 4 + 3] = 0;
        tailData[count * 2] = blob.tx;
        tailData[count * 2 + 1] = blob.ty;
        count += 1;
      }

      const { program, uniforms, buffer, position } = pipeline;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.uSize, view.width + MARGIN * 2, view.height + MARGIN * 2);
      gl.uniform1f(uniforms.uRatio, canvas.width / Math.max(1, view.width + MARGIN * 2));
      gl.uniform4fv(uniforms.uPills, pillData);
      gl.uniform4f(uniforms.uHover, hover.x + MARGIN, hover.y + MARGIN, hover.w / 2, hover.h / 2);
      gl.uniform4fv(uniforms.uDrops, dropData);
      gl.uniform2fv(uniforms.uTails, tailData);
      gl.uniform1i(uniforms.uCount, count);
      gl.uniform1f(uniforms.uSmooth, smooth);
      gl.uniform3f(uniforms.uPill, pillRgb[0], pillRgb[1], pillRgb[2]);
      const [hr, hg, hb, ha] = SETTINGS.hoverRgba;
      gl.uniform4f(uniforms.uHoverColor, hr, hg, hb, ha * hover.alpha);
      gl.uniform1f(uniforms.uShadow, SETTINGS.shadow);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // A lost context (GPU reset, too many contexts) must never leave a blank canvas.
    const onContextLost = (event: Event) => {
      event.preventDefault();
      pipeline = null;
      showFallback(true);
      render();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const emergeTime = 0.09;
      const absorbTime = 0.12;

      for (let i = drops.length - 1; i >= 0; i -= 1) {
        const drop = drops[i];
        if (!drop) continue;
        if (drop.state === 'waiting') {
          if (now < drop.leave) continue;
          drop.state = 'flying';
          plan(drop, drop.index, now, true);
        }
        if (drop.state === 'flying') {
          drop.emerged = Math.min(1, drop.emerged + dt / emergeTime);
          const source = pills.get(drop.source);
          if (source && drop.given < drop.mass) {
            const step = Math.min(drop.mass * (dt / emergeTime), drop.mass - drop.given);
            source.mass = Math.max(0, source.mass - step);
            source.outgoing = Math.max(0, source.outgoing - step);
            drop.given += step;
          }
          const t = clamp01((now - drop.start) / 1000 / drop.duration);
          const eased = travelEase(t);
          const [x0, y0, x1, y1, x2, y2, x3, y3] = drop.path;
          const x = bezier(x0, x1, x2, x3, eased);
          const y = bezier(y0, y1, y2, y3, eased);
          if (dt > 0) {
            drop.vx = (x - drop.x) / dt;
            drop.vy = (y - drop.y) / dt;
          }
          drop.x = x;
          drop.y = y;
          if (t >= 1) drop.state = 'absorbing';
        }
        if (drop.state === 'absorbing') {
          const step = Math.min(1 - drop.absorbed, dt / absorbTime);
          drop.absorbed += step;
          drop.vx *= 0.8;
          drop.vy *= 0.8;
          const host = pill(drop.index);
          host.mass = Math.min(1, host.mass + drop.mass * step);
          if (drop.absorbed >= 1) drops.splice(i, 1);
        }
      }

      const zeta = reduced ? 1 : 1 - 0.72 * clamp01(SETTINGS.wobble);
      const omega = 26;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (const [index, state] of pills) {
        for (let n = 0; n < steps; n += 1) {
          state.velocity +=
            (omega * omega * (state.mass - state.scale) - 2 * zeta * omega * state.velocity) * h;
          state.scale += state.velocity * h;
        }
        const gone =
          state.mass <= 0.002 && state.outgoing <= 0.002 && Math.abs(state.scale) < 0.004;
        if (index !== target && gone) pills.delete(index);
      }

      const hoverRect = rects[hover.index];
      if (hoverRect) {
        const k = 1 - Math.exp(-dt / 0.06);
        hover.x += (hoverRect.x + hoverRect.w / 2 - hover.x) * k;
        hover.y += (hoverRect.y + hoverRect.h / 2 - hover.y) * k;
        hover.w += (hoverRect.w - hover.w) * k;
        hover.h += (hoverRect.h - hover.h) * k;
      }
      const hoverGoal = hover.index >= 0 && hover.index !== target ? 1 : 0;
      hover.alpha += (hoverGoal - hover.alpha) * (1 - Math.exp(-dt / 0.08));

      render();

      const resting =
        drops.length === 0 &&
        [...pills.values()].every(
          (state) =>
            Math.abs(state.mass - state.scale) < 0.0008 && Math.abs(state.velocity) < 0.004,
        );
      const hovering =
        Math.abs(hoverGoal - hover.alpha) > 0.003 ||
        (hoverRect !== undefined &&
          Math.abs(hoverRect.x + hoverRect.w / 2 - hover.x) + Math.abs(hoverRect.w - hover.w) >
            0.1);
      if (!resting || hovering) raf = requestAnimationFrame(frame);
      else {
        for (const [index, state] of pills) {
          if (state.mass <= 0.002) pills.delete(index);
          else {
            state.scale = state.mass;
            state.velocity = 0;
          }
        }
        hover.alpha = hoverGoal;
        render();
      }
    };

    const wake = () => {
      if (raf || disposed) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const settle = (index: number) => {
      pills.clear();
      drops.length = 0;
      target = index;
      if (index >= 0) {
        const state = pill(index);
        state.mass = 1;
        state.scale = 1;
        state.velocity = 0;
      }
      render();
    };

    const go = (index: number) => {
      if (index === target) return;
      if (reduced || !pipeline) {
        settle(index);
        return;
      }
      const now = performance.now();
      const from = target;
      target = index;
      if (index < 0) {
        // No current item (home, contact): the pill shrinks away.
        drops.length = 0;
        for (const state of pills.values()) state.mass = 0;
      } else if (from < 0 && drops.length === 0) {
        // Coming from no current item: the pill grows in place, with a wobble.
        pill(index).mass = 1;
      } else {
        pill(index);
        for (const drop of drops) {
          drop.index = index;
          if (drop.state === 'flying') plan(drop, index, now, false);
          if (drop.state === 'absorbing') {
            drop.state = 'flying';
            drop.mass *= 1 - drop.absorbed;
            drop.absorbed = 0;
            plan(drop, index, now, false);
          }
        }
        for (const source of [...pills.keys()]) {
          if (source !== index) emit(source, index, now);
        }
      }
      wake();
    };

    const onOver = (event: PointerEvent) => {
      const item = event.target instanceof Element ? event.target.closest('[data-gooey]') : null;
      const index = item ? gooeyItems(host).indexOf(item) : -1;
      const rect = rects[index];
      if (!rect) return;
      if (hover.alpha < 0.01) {
        hover.x = rect.x + rect.w / 2;
        hover.y = rect.y + rect.h / 2;
        hover.w = rect.w;
        hover.h = rect.h;
      }
      hover.index = index;
      wake();
    };
    const onLeave = () => {
      hover.index = -1;
      wake();
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (drops.length === 0) settle(target);
      else render();
    });
    resizeObserver.observe(stage);
    host.addEventListener('pointerover', onOver);
    host.addEventListener('pointerleave', onLeave);

    measure();
    settle(currentIndex(gooeyItems(host)));
    void document.fonts.ready.then(() => {
      if (disposed) return;
      measure();
      if (drops.length === 0) settle(target);
    });

    engineRef.current = {
      go: (index) => {
        measure();
        go(index);
      },
      refresh: () => {
        pillRgb = parseHex(getComputedStyle(host).getPropertyValue('--color-nav-pill'));
        render();
      },
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      host.removeEventListener('pointerover', onOver);
      host.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (gl && pipeline) {
        gl.deleteBuffer(pipeline.buffer);
        gl.deleteProgram(pipeline.program);
      }
      // No loseContext() here: React re-runs effects on the same canvas (Strict Mode, fast
      // refresh), and a deliberately lost context never comes back. The context is
      // released with the canvas when it really unmounts.
      overlay.replaceChildren();
      engineRef.current = null;
    };
  }, []);

  // After navigation the links' aria-current has updated: flow to the new item.
  useEffect(() => {
    const host = stageRef.current?.parentElement;
    if (!host) return;
    engineRef.current?.go(currentIndex(gooeyItems(host)));
  }, [pathname]);

  useEffect(() => {
    engineRef.current?.refresh();
  }, [theme]);

  return (
    <div ref={stageRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="absolute" />
      <span
        ref={fallbackRef}
        className="absolute top-0 left-0 hidden rounded-full bg-nav-pill transition-[transform,width,height,opacity] duration-500 ease-futuristic"
      />
      {/* Dark copies of the labels, clipped to the pill: above the real labels (z-10). */}
      <div
        ref={overlayRef}
        inert
        className="invisible absolute inset-0 z-10 [&_*]:text-nav-pill-ink! [&_*]:transition-none!"
      />
    </div>
  );
}
