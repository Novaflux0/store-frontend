'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, type ShaderMaterial } from 'three';

import type { Theme } from '@/lib/theme';

import type { JourneyState } from './journey-math';

/**
 * Vein colours for the web. Indigo veins, a deeper indigo for their halos and warm
 * white where veins meet; the light theme uses darker shades that read on the pale page.
 */
const WEB_COLORS = {
  dark: { bg: '#05060a', vein: '#5b66e8', deep: '#2b3190', node: '#efe2c8' },
  light: { bg: '#f6f7fb', vein: '#4338ca', deep: '#818cf8', node: '#b45309' },
} as const satisfies Record<Theme, Record<'bg' | 'vein' | 'deep' | 'node', string>>;

const VERTEX = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // A 2x2 plane drawn straight in clip space: it always fills the frame.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * A domain-warped Voronoi web. Cell borders (where the nearest and second-nearest
 * cell centres are about equally far) become veins with a soft halo; junctions of
 * three cells get a warm glow. A bright hub of light right of centre whitens the veins
 * around it, and the left side (the headline's side) is dimmed.
 */
const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uAspect;
  uniform float uEnergy;
  uniform float uLight;
  uniform vec3 uBg;
  uniform vec3 uVein;
  uniform vec3 uDeep;
  uniform vec3 uNode;
  varying vec2 vUv;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash2(i).x;
    float b = hash2(i + vec2(1.0, 0.0)).x;
    float c = hash2(i + vec2(0.0, 1.0)).x;
    float d = hash2(i + vec2(1.0, 1.0)).x;
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < OCTAVES; i++) {
      sum += amp * noise(p);
      p = p * 2.03 + 17.0;
      amp *= 0.5;
    }
    return sum;
  }

  // Distances to the nearest three cell centres (x < y < z).
  vec3 cells(vec2 p, float t) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec3 d = vec3(8.0);
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = 0.5 + 0.42 * sin(t + 6.2831 * hash2(i + g));
        float dist = length(g + o - f);
        if (dist < d.x) {
          d = vec3(dist, d.x, d.y);
        } else if (dist < d.y) {
          d = vec3(d.x, dist, d.y);
        } else if (dist < d.z) {
          d.z = dist;
        }
      }
    }
    return d;
  }

  // Built in display (sRGB) values, so the dark cells stay near black; converted back
  // to linear at the end for three.js's output conversion.
  vec3 display(vec3 linear) {
    return pow(linear, vec3(1.0 / 2.2));
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float t = uTime;
    vec3 bg = display(uBg);
    vec3 veinColor = display(uVein);
    vec3 deepColor = display(uDeep);
    vec3 nodeColor = display(uNode);

    // A slow domain warp bends the cells into organic, curving veins.
    vec2 warp = vec2(
      fbm(p * 1.2 + vec2(0.0, t * 0.025)),
      fbm(p * 1.2 + vec2(5.2, -t * 0.02))
    ) - 0.5;
    vec2 q = p * 2.6 + warp * 1.5;
    // A second, smooth warp bows the straight cell borders into soft curves.
    q += (vec2(noise(q * 0.9 + 3.1 + t * 0.02), noise(q * 0.9 + 8.3 - t * 0.02)) - 0.5) * 0.55;

    vec3 c = cells(q, t * 0.12);
    float edge = c.y - c.x;
    // A wide soft glow on every vein; a thin bright core only near the hub.
    float soft = 0.07 / (edge + 0.07);
    soft *= soft * soft;
    float core = 0.012 / (edge + 0.012);
    core *= core;
    float junction = 1.0 - smoothstep(0.0, 0.14, c.z - c.x);

    float fine = 0.0;
    #if LAYERS > 1
      vec3 c2 = cells(q * 2.2 + 3.7, t * 0.18);
      fine = 0.03 / (c2.y - c2.x + 0.03);
      fine *= fine * fine * 0.08;
    #endif

    // The hub: light pooling where veins meet right of centre, a little above the
    // middle, drifting slightly. Veins brighten and whiten towards it.
    vec2 hub = vec2(0.07 * uAspect + 0.03 * sin(t * 0.13), 0.08 + 0.02 * cos(t * 0.11));
    float d = length(p - hub);
    float near = exp(-d * 2.4);
    float pool = exp(-d * d / 0.045);
    float knot = exp(-d * d / 0.008);

    // Veins fade in and out along their length, and whole stretches of the web go
    // dark; the text side is calmer.
    float along = 0.25 + 0.75 * smoothstep(0.3, 0.7, noise(q * 1.6 + t * 0.04));
    float field = smoothstep(0.38, 0.62, fbm(q * 0.45 + 11.0 + t * 0.015));
    field = max(0.04 + 0.96 * field * along, exp(-d * 4.0));
    float side = mix(0.3, 1.0, smoothstep(0.1, 0.65, vUv.x));
    float strength = field * side * uEnergy;

    // Thick, cream-white branches where the light pools; blue veins elsewhere.
    float branch = 0.03 / (edge + 0.03);
    branch *= branch;
    vec3 tint = mix(deepColor, veinColor, 0.35 + 0.65 * soft);
    vec3 glow = tint * (soft * 0.75 + fine) * strength;
    glow += mix(veinColor, vec3(0.92, 0.92, 1.0), near * 0.5) * core * near * near * 0.9 * strength;
    glow += nodeColor * (soft * junction * 0.08 * strength + branch * pool * 1.5 * uEnergy);
    glow += nodeColor * branch * knot * 1.2 * uEnergy;
    glow += deepColor * near * 0.1 * uEnergy;

    vec3 color = uLight > 0.5
      ? mix(bg, veinColor, clamp(dot(glow, vec3(0.3, 0.4, 0.3)) * 1.4, 0.0, 0.75))
      : bg + glow;
    color = pow(clamp(color, 0.0, 1.0), vec3(2.2));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Detail per quality tier: a second, finer web and more noise octaves on capable devices. */
const DEFINES = {
  low: { LAYERS: 1, OCTAVES: 3 },
  high: { LAYERS: 2, OCTAVES: 4 },
} as const;

/**
 * Glowing filaments: a full-frame web of light behind the page, drawn first so the
 * rest of the scene sits on it (one draw call, no textures). It follows the journey
 * pose: dimmer while the work ring shows, brightest as everything converges at the
 * call to action.
 */
export function Filaments({
  detail,
  theme,
  live,
}: {
  readonly detail: 'low' | 'high';
  readonly theme: Theme;
  readonly live: RefObject<JourneyState>;
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  // A theme change swaps in a new set; the per-frame values are rewritten every frame.
  const uniforms = useMemo(() => {
    const colors = WEB_COLORS[theme];
    return {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uEnergy: { value: 1 },
      uLight: { value: theme === 'light' ? 1 : 0 },
      uBg: { value: new Color(colors.bg) },
      uVein: { value: new Color(colors.vein) },
      uDeep: { value: new Color(colors.deep) },
      uNode: { value: new Color(colors.node) },
    };
  }, [theme]);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    const { ring, converge } = live.current.pose;
    const { uTime, uAspect, uEnergy } = material.uniforms;
    if (uTime) uTime.value = state.clock.elapsedTime;
    if (uAspect) uAspect.value = state.size.width / Math.max(state.size.height, 1);
    if (uEnergy) uEnergy.value = 1 - ring * 0.35 + converge * 0.3;
  });

  return (
    // Keyed by detail: new defines need a fresh material to recompile.
    <mesh key={detail} renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        defines={DEFINES[detail]}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
