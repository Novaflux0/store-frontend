'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

import type { HomePageData } from '@agency/validation';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface StackFlowProps {
  readonly tech: HomePageData['tech'];
  /** Brand name in the hub of the diagram (site settings). */
  readonly siteName: string;
}

/** Comet colours, one per tool in turn. */
const COMET_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#22d3ee', '#ec4899'];

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A cubic Bézier from a tool's icon down into the top of the hub. */
interface Curve {
  readonly p0: Point;
  readonly p1: Point;
  readonly p2: Point;
  readonly p3: Point;
  readonly color: string;
}

interface Comet {
  readonly curve: number;
  readonly start: number;
  readonly duration: number;
}

interface Spark {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly radius: number;
  readonly born: number;
  readonly life: number;
  readonly color: string;
}

interface Flash {
  readonly born: number;
  readonly color: string;
}

function at(c: Curve, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * c.p0.x + b * c.p1.x + d * c.p2.x + e * c.p3.x,
    y: a * c.p0.y + b * c.p1.y + d * c.p2.y + e * c.p3.y,
  };
}

/** Comets pick up speed on the way down. */
const ease = (t: number) => t * t;
const TAIL_STEPS = 12;
const TAIL_SPACING = 0.0075;
const SPARK_LIFE = 0.9;
const ARC_LIFE = 0.6;
const RIPPLE_LIFE = 1.8;

/**
 * Just the mark of a tool's logo: the logos are a square glyph at the left followed by
 * the name, and the name is printed under the circle already. Drawn as a CSS mask in
 * the current text colour. `src` is validated (`logoSchema`: no quotes, parentheses or
 * semicolons) and also quoted, so it can never close the CSS `url()`.
 */
function ToolGlyph({ logo }: { readonly logo: HomePageData['tech'][number]['logo'] }) {
  const mask = `url(${JSON.stringify(logo.src)}) left center / auto 100% no-repeat`;
  return (
    <span
      role="img"
      aria-label={logo.alt}
      className="block size-6 bg-current text-ink"
      style={{ mask, WebkitMask: mask }}
    />
  );
}

/**
 * Our stack as a diagram: every tool's icon in a row, a curve from each one down into
 * a hub with the studio's spinning mark. Comets (a white head with a fading tail in the
 * tool's colour) set off at random, speed up on the way down and burst into sparks on
 * the hub, which flashes an arc and sends out a ripple. Drawn on one 2D canvas behind
 * the icons and the hub, measured from their real positions; the loop runs only while
 * the diagram is on screen. Under reduced motion the curves are drawn once, still.
 * Below tablet width the tools wrap into rows of four and a single line joins them to
 * the hub.
 */
export function StackFlow({ tech, siteName }: StackFlowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const count = tech.length;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const hubElement = hubRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !hubElement || !ctx) return;

    // Always on the light section (OurStack), whatever the site theme.
    const lineColor = '#b9bfcc';
    const headColor = '#0f0f0f';

    let curves: Curve[] = [];
    let hub = { x: 0, y: 0, r: 0 };
    let dpr = 1;
    let width = 0;
    let height = 0;

    const comets: Comet[] = [];
    let sparks: Spark[] = [];
    let flashes: Flash[] = [];
    let nextLaunch: number[] = [];
    let frame = 0;
    let running = false;

    const measure = () => {
      const box = root.getBoundingClientRect();
      width = box.width;
      height = box.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const hubBox = hubElement.getBoundingClientRect();
      hub = {
        x: hubBox.left - box.left + hubBox.width / 2,
        y: hubBox.top - box.top + hubBox.height / 2,
        r: hubBox.width / 2,
      };
      const end = { x: hub.x, y: hub.y - hub.r };
      curves = Array.from(root.querySelectorAll<HTMLElement>('[data-stack-icon]'), (icon, i) => {
        const r = icon.getBoundingClientRect();
        const start = { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
        const drop = end.y - start.y;
        return {
          p0: start,
          p1: { x: start.x, y: start.y + drop * 0.55 },
          p2: { x: end.x, y: start.y + drop * 0.45 },
          p3: end,
          color: COMET_COLORS[i % COMET_COLORS.length] ?? '#22d3ee',
        };
      });
    };

    const drawCurves = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      for (const c of curves) {
        ctx.beginPath();
        ctx.moveTo(c.p0.x, c.p0.y);
        ctx.bezierCurveTo(c.p1.x, c.p1.y, c.p2.x, c.p2.y, c.p3.x, c.p3.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const land = (curve: Curve, now: number) => {
      const { x, y } = curve.p3;
      for (let i = 0; i < 16; i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
        const speed = 20 + Math.random() * 55;
        sparks.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + Math.random() * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.2 + Math.random() * 1.8,
          born: now,
          life: SPARK_LIFE * (0.6 + Math.random() * 0.4),
          color: curve.color,
        });
      }
      flashes.push({ born: now, color: curve.color });
    };

    const draw = (now: number) => {
      const seconds = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawCurves();
      ctx.globalCompositeOperation = 'source-over';

      // Launch: each curve fires again a random while after its last comet landed.
      curves.forEach((_, i) => {
        const due = nextLaunch[i] ?? 0;
        if (seconds < due) return;
        const duration = 1.5 + Math.random() * 0.8;
        comets.push({ curve: i, start: seconds, duration });
        nextLaunch[i] = seconds + duration + 1.4 + Math.random() * 3.6;
      });

      for (let n = comets.length - 1; n >= 0; n -= 1) {
        const comet = comets[n];
        const curve = comet ? curves[comet.curve] : undefined;
        if (!comet || !curve) continue;
        const progress = (seconds - comet.start) / comet.duration;
        if (progress >= 1) {
          comets.splice(n, 1);
          land(curve, seconds);
          continue;
        }
        // The tail: points further back in time, so it stretches as the comet speeds up.
        let previous = at(curve, ease(progress));
        for (let k = 1; k <= TAIL_STEPS; k += 1) {
          const point = at(curve, ease(Math.max(progress - k * TAIL_SPACING, 0)));
          const fade = 1 - k / TAIL_STEPS;
          ctx.strokeStyle = curve.color;
          ctx.globalAlpha = fade * 0.9;
          ctx.lineWidth = 0.6 + fade * 2.4;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
          previous = point;
        }
        const head = at(curve, ease(progress));
        ctx.globalAlpha = 1;
        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      sparks = sparks.filter((spark) => seconds - spark.born < spark.life);
      for (const spark of sparks) {
        const age = seconds - spark.born;
        ctx.globalAlpha = (1 - age / spark.life) * 0.9;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x + spark.vx * age, spark.y + spark.vy * age, spark.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      flashes = flashes.filter((flash) => seconds - flash.born < RIPPLE_LIFE);
      for (const flash of flashes) {
        const age = seconds - flash.born;
        if (age < ARC_LIFE) {
          // An arc of the hub's rim lights up where the comet came in.
          ctx.globalAlpha = 1 - age / ARC_LIFE;
          ctx.strokeStyle = flash.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hub.x, hub.y, hub.r + 3, Math.PI * 1.18, Math.PI * 1.82);
          ctx.stroke();
        }
        // A faint ripple spreading out from the hub.
        const spread = age / RIPPLE_LIFE;
        ctx.globalAlpha = (1 - spread) * 0.22;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hub.r + 6 + spread * 90, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      const seconds = performance.now() / 1000;
      nextLaunch = curves.map(() => seconds + Math.random() * 3.5);
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const still = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawCurves();
    };

    measure();
    still();

    const resize = new ResizeObserver(() => {
      measure();
      if (!running) still();
    });
    resize.observe(root);
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else stop();
    });
    visibility.observe(root);

    return () => {
      stop();
      resize.disconnect();
      visibility.disconnect();
    };
  }, [reducedMotion, count]);

  return (
    <div ref={rootRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden size-full md:block"
      />

      <ul
        className="relative grid grid-cols-4 gap-y-8 md:grid-cols-[repeat(var(--tools),minmax(0,1fr))]"
        style={{ '--tools': count } as CSSProperties}
      >
        {tech.map((tool) => (
          <li key={tool.name} className="flex flex-col items-center text-center">
            <span
              data-stack-icon=""
              className="grid size-16 place-items-center rounded-full border border-ink/10 bg-white shadow-[0_0_0_6px_var(--color-paper),0_8px_20px_rgb(15_15_15/0.08)]"
            >
              <ToolGlyph logo={tool.logo} />
            </span>
            <span className="mt-3 text-sm font-semibold text-ink">{tool.name}</span>
            {tool.role ? (
              <span className="mt-0.5 text-[0.65rem] tracking-[0.18em] text-ink/60 uppercase">
                {tool.role}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Tablet and up: the curves fill this gap. Phones: one line down to the hub. */}
      <div aria-hidden="true" className="mx-auto h-16 w-px bg-ink/20 md:h-40 md:bg-transparent" />

      <div className="relative mx-auto flex w-fit flex-col items-center text-center">
        <div
          ref={hubRef}
          className="grid size-24 place-items-center rounded-full border border-ink/10 bg-white p-2 shadow-[0_10px_30px_rgb(15_15_15/0.08)]"
        >
          <span className="grid size-full place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#eef0f5)] [perspective:420px]">
            {/* The mark turns slowly in 3D; the stacked shadows give the letter depth. */}
            <span
              aria-hidden="true"
              className="stack-spin inline-block font-display text-4xl font-bold text-ink [text-shadow:1px_1px_0_#c9ced8,2px_2px_0_#b3b9c6,3px_3px_0_#9aa1b0]"
            >
              {siteName.charAt(0)}
            </span>
          </span>
        </div>
        <span className="mt-4 font-display text-sm font-bold tracking-[0.08em] text-ink uppercase">
          {siteName}
        </span>
        <span className="mt-0.5 text-[0.65rem] tracking-[0.18em] text-ink/60 uppercase">
          Your next product
        </span>
      </div>
    </div>
  );
}
