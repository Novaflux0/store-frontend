/**
 * Pure maths of the scroll-driven 3D journey (no three.js, no DOM), so it is unit
 * tested. The page marks its sections with `data-journey-stage="0..5"`; the scene
 * turns the scroll position into a fractional stage and blends the stage poses.
 */

export interface StagePose {
  /** Camera distance and height. */
  readonly cameraZ: number;
  readonly cameraY: number;
  /** Core position and size. */
  readonly coreX: number;
  readonly coreY: number;
  readonly coreScale: number;
  /** 0..1: satellites orbiting the core (one per service). */
  readonly satellites: number;
  /** 0..1: background filament web dimmed. */
  readonly ring: number;
  /** 0..1: the process path and its step nodes. */
  readonly path: number;
  /** 0..1: everything pulled into the core (call to action). */
  readonly converge: number;
  /** Canvas opacity: lower behind text-heavy sections. */
  readonly opacity: number;
}

/** One pose per `data-journey-stage`, in page order. */
export const STAGES = [
  // 0 Hero: the light bulb above the wireframe hand (pinned to the hero artwork by
  // `heroPin`, so this pose only shapes the hand-over to stage 1), in a starfield.
  {
    cameraZ: 6,
    cameraY: 0,
    coreX: 0,
    coreY: 1.55,
    coreScale: 0.5,
    satellites: 0,
    ring: 0,
    path: 0,
    converge: 0,
    opacity: 1,
  },
  // 1 Services: satellites spin out of the core.
  {
    cameraZ: 7,
    cameraY: 0.4,
    coreX: 2.4,
    coreY: 0,
    coreScale: 0.75,
    satellites: 1,
    ring: 0,
    path: 0,
    converge: 0,
    opacity: 0.85,
  },
  // 2 Work and results: the camera pulls back, the filament web dims.
  {
    cameraZ: 9,
    cameraY: 0,
    coreX: 0,
    coreY: 0,
    coreScale: 0.5,
    satellites: 0.35,
    ring: 1,
    path: 0,
    converge: 0,
    opacity: 0.6,
  },
  // 3 How we work: a glowing path with one node per step, above the step list; the core
  // moves up out of view.
  {
    cameraZ: 7,
    cameraY: 0,
    coreX: 0,
    coreY: 4,
    coreScale: 0.25,
    satellites: 0,
    ring: 0,
    path: 1,
    converge: 0,
    opacity: 0.75,
  },
  // 4 Why us to FAQ: quiet, dimmed backdrop behind dense text.
  {
    cameraZ: 8,
    cameraY: 0,
    coreX: 3.2,
    coreY: -0.6,
    coreScale: 0.45,
    satellites: 0,
    ring: 0,
    path: 0,
    converge: 0,
    opacity: 0.3,
  },
  // 5 Call to action: everything converges into a bright core.
  {
    cameraZ: 5,
    cameraY: 0,
    coreX: 0,
    coreY: 0,
    coreScale: 1.3,
    satellites: 0.6,
    ring: 0,
    path: 0,
    converge: 1,
    opacity: 1,
  },
] as const satisfies readonly StagePose[];

/** Share of each stage held before blending into the next one starts. */
const HOLD = 0.5;

/**
 * Longer holds per stage index. The quiet stage spans five text-heavy sections, so it
 * blends into the call to action only as the call to action reaches the reading line.
 */
const HOLDS: Readonly<Partial<Record<number, number>>> = { 4: 0.95 };

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Hermite smoothstep of `value` between `edge0` and `edge1`. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Fractional stage for a reading line at document offset `y`, given the document
 * offsets of the stage markers (ascending): `2.5` is halfway from stage 2 to stage 3.
 */
export function stageAt(y: number, markerTops: readonly number[]): number {
  const first = markerTops[0];
  if (first === undefined || y <= first) return 0;
  for (let index = 0; index < markerTops.length - 1; index += 1) {
    const start = markerTops[index] ?? 0;
    const end = markerTops[index + 1] ?? start;
    if (y < end) return index + (end > start ? (y - start) / (end - start) : 0);
  }
  return markerTops.length - 1;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * The pose at fractional stage `stage`: each stage's pose holds for the first half of
 * its section, then eases into the next one.
 */
export function poseAt(stage: number, stages: readonly StagePose[] = STAGES): StagePose {
  const last = stages.length - 1;
  const clamped = Math.min(last, Math.max(0, stage));
  const index = Math.min(last, Math.floor(clamped));
  const from = stages[index];
  const to = stages[Math.min(last, index + 1)];
  if (!from || !to) throw new RangeError('poseAt needs at least one stage.');
  const t = smoothstep(HOLDS[index] ?? HOLD, 1, clamped - index);
  return {
    cameraZ: lerp(from.cameraZ, to.cameraZ, t),
    cameraY: lerp(from.cameraY, to.cameraY, t),
    coreX: lerp(from.coreX, to.coreX, t),
    coreY: lerp(from.coreY, to.coreY, t),
    coreScale: lerp(from.coreScale, to.coreScale, t),
    satellites: lerp(from.satellites, to.satellites, t),
    ring: lerp(from.ring, to.ring, t),
    path: lerp(from.path, to.path, t),
    converge: lerp(from.converge, to.converge, t),
    opacity: lerp(from.opacity, to.opacity, t),
  };
}

/** Index of the process stage; the path scrolls through its steps during it. */
export const PROCESS_STAGE = 3;

/** 0..1 progress through the process section (0 before it, 1 after it). */
export function processProgress(stage: number): number {
  return clamp01(stage - PROCESS_STAGE);
}

/** Frame-rate independent exponential smoothing (same as three's `MathUtils.damp`). */
export function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

/**
 * Per-frame journey state, shared by the scene parts and advanced once per frame. A
 * mutable object on purpose: it changes every frame, so it never goes through React.
 */
export class JourneyState {
  stage = -1;
  pose: StagePose = poseAt(0);
  process = 0;

  /** Eases toward `target` (a fractional stage); jumps there on the first frame. */
  advance(target: number, delta: number): void {
    this.stage = this.stage < 0 ? target : damp(this.stage, target, 4, delta);
    this.pose = poseAt(this.stage);
    this.process = processProgress(this.stage);
  }
}

/**
 * Size factor for the core on narrow (portrait) screens: the camera sees less width
 * there, so a core sized for desktop would fill a phone. 1 from a 6:5 aspect upwards,
 * never below half size.
 */
export function coreFit(aspect: number): number {
  return Math.min(1, Math.max(0.5, aspect / 1.2));
}

/** Most drawing-buffer pixels the scene renders: one 4K frame (3840 × 2160). */
export const MAX_CANVAS_PIXELS = 3840 * 2160;

/**
 * Pixel ratio that keeps a `width` × `height` (CSS px) canvas within `maxPixels`.
 * Ordinary screens keep `dpr`; an extreme viewport (a tall portrait monitor, or a
 * tool that resizes the viewport to the full page height) renders at a lower ratio
 * instead of allocating an unbounded WebGL framebuffer.
 */
export function budgetDpr(
  width: number,
  height: number,
  dpr: number,
  maxPixels: number = MAX_CANVAS_PIXELS,
): number {
  const area = width * height;
  if (area <= 0) return dpr;
  return Math.min(dpr, Math.sqrt(maxPixels / area));
}
