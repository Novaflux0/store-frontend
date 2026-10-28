import type { Theme } from '@/lib/theme';

/** Mirrors the bg / neon-cyan / neon-violet tokens of each theme in globals.css. */
export const PALETTES = {
  dark: { bg: '#05060a', cyan: '#22d3ee', violet: '#8b5cf6' },
  light: { bg: '#f6f7fb', cyan: '#0e7490', violet: '#7c3aed' },
} as const satisfies Record<Theme, Record<'bg' | 'cyan' | 'violet', string>>;

export type Palette = (typeof PALETTES)[Theme];

/** Deterministic pseudo-random numbers, so the scene looks the same on every load. */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
