/**
 * Pure maths of the hero light bulb (no three.js, no DOM), so it is unit tested: the
 * lathe profile of the low-poly bulb, its blink cycle and how strongly it is pinned
 * to the hand in the hero.
 */

import { smoothstep } from './journey-math';

/** `[radius, height]` from the bottom tip (0) to the top of the glass (1). */
export type ProfilePoint = readonly [number, number];

const THREAD_TOP = 0.24;
const THREAD_COUNT = 4;

/**
 * Side profile of the bulb, turned around the vertical axis by `LatheGeometry`: a
 * rounded tip, a screw base with `THREAD_COUNT` threads, a neck that widens into the
 * glass, and a dome. Heights strictly increase.
 */
export function bulbProfile(): ProfilePoint[] {
  const threads: ProfilePoint[] = [];
  const pitch = (THREAD_TOP - 0.06) / THREAD_COUNT;
  for (let i = 0; i < THREAD_COUNT; i += 1) {
    const y = 0.06 + i * pitch;
    threads.push([0.125, y], [0.142, y + pitch / 2]);
  }
  return [
    [0, 0],
    [0.05, 0.015],
    [0.1, 0.04],
    ...threads,
    [0.13, THREAD_TOP],
    [0.13, 0.27],
    [0.16, 0.33],
    [0.21, 0.4],
    [0.27, 0.48],
    [0.32, 0.57],
    [0.345, 0.67],
    [0.335, 0.77],
    [0.29, 0.86],
    [0.2, 0.94],
    [0.09, 0.985],
    [0, 1],
  ];
}

/** Height of the boundary between the metal base and the glass. */
export const GLASS_START = 0.27;

const BLINK_PERIOD = 5;

/**
 * Brightness of the filament (0 off, 1 on) at `time` seconds. Per 5 s cycle: on with
 * a faint shimmer, fades out, stays off for a moment, then flickers back on like a
 * real bulb.
 */
export function bulbLight(time: number): number {
  const t = ((time % BLINK_PERIOD) + BLINK_PERIOD) % BLINK_PERIOD;
  if (t < 3) return 0.94 + Math.sin(t * 9) * 0.06;
  if (t < 3.35) return 1 - smoothstep(3, 3.35, t);
  if (t < 4.2) return 0;
  // Flicker: two quick pulses, then on.
  if (t < 4.3) return 0.7;
  if (t < 4.4) return 0.1;
  if (t < 4.5) return 0.85;
  if (t < 4.6) return 0.25;
  return smoothstep(4.6, 4.9, t);
}

/**
 * How much the bulb follows its spot above the hand (1) rather than the journey pose
 * (0): fully pinned while the hero holds, released as the page moves on to stage 1.
 */
export function heroPin(stage: number): number {
  if (stage >= 1) return 0;
  return 1 - smoothstep(0.5, 1, Math.max(0, stage));
}
