import { describe, expect, it } from 'vitest';

import {
  JourneyState,
  MAX_CANVAS_PIXELS,
  STAGES,
  budgetDpr,
  clamp01,
  coreFit,
  damp,
  poseAt,
  processProgress,
  smoothstep,
  stageAt,
} from './journey-math';

const TOPS = [0, 1000, 2000, 4000];

describe('stageAt', () => {
  it('is 0 before the first marker and without markers', () => {
    expect(stageAt(-50, TOPS)).toBe(0);
    expect(stageAt(500, [])).toBe(0);
  });

  it('interpolates between markers, including uneven section heights', () => {
    expect(stageAt(500, TOPS)).toBe(0.5);
    expect(stageAt(1000, TOPS)).toBe(1);
    expect(stageAt(3000, TOPS)).toBe(2.5);
  });

  it('stays on the last stage after the last marker', () => {
    expect(stageAt(9000, TOPS)).toBe(3);
  });

  it('does not divide by zero for markers at the same offset', () => {
    expect(stageAt(1000, [0, 1000, 1000, 2000])).toBe(2);
  });
});

describe('poseAt', () => {
  it('returns the exact stage poses on whole stages', () => {
    expect(poseAt(0)).toEqual(STAGES[0]);
    expect(poseAt(5)).toEqual(STAGES[5]);
  });

  it('holds a pose for the first half of a stage, then eases into the next', () => {
    expect(poseAt(1.4)).toEqual(STAGES[1]);
    const halfway = poseAt(1.75);
    expect(halfway.cameraZ).toBeCloseTo((STAGES[1].cameraZ + STAGES[2].cameraZ) / 2);
    expect(halfway.ring).toBeCloseTo(0.5);
  });

  it('clamps stages outside the range', () => {
    expect(poseAt(-3)).toEqual(STAGES[0]);
    expect(poseAt(42)).toEqual(STAGES[5]);
  });

  it('needs at least one stage', () => {
    expect(() => poseAt(0, [])).toThrow(RangeError);
  });
});

describe('helpers', () => {
  it('clamps, smooths and maps the process progress', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0.5, 1, 0.2)).toBe(0);
    expect(processProgress(2.4)).toBe(0);
    expect(processProgress(3.25)).toBe(0.25);
    expect(processProgress(4.5)).toBe(1);
  });
});

describe('JourneyState', () => {
  it('jumps to the target on the first frame, then eases toward it', () => {
    const journey = new JourneyState();
    journey.advance(3.5, 1 / 60);
    expect(journey.stage).toBe(3.5);
    expect(journey.process).toBe(0.5);
    expect(journey.pose).toEqual(poseAt(3.5));

    journey.advance(4.5, 1 / 60);
    expect(journey.stage).toBeGreaterThan(3.5);
    expect(journey.stage).toBeLessThan(4.5);
  });

  it('damps independently of the frame rate', () => {
    const oneStep = damp(0, 1, 4, 0.1);
    const twoSteps = damp(damp(0, 1, 4, 0.05), 1, 4, 0.05);
    expect(twoSteps).toBeCloseTo(oneStep);
  });
});

describe('coreFit', () => {
  it('shrinks the core on portrait screens, within limits', () => {
    expect(coreFit(16 / 9)).toBe(1);
    expect(coreFit(0.9)).toBeCloseTo(0.75);
    expect(coreFit(0.45)).toBe(0.5);
  });
});

describe('budgetDpr', () => {
  it('keeps the pixel ratio of ordinary screens', () => {
    expect(budgetDpr(1920, 1080, 1.75)).toBe(1.75);
    expect(budgetDpr(2560, 1440, 1.5)).toBe(1.5);
    expect(budgetDpr(412, 915, 1.75)).toBe(1.75);
  });

  it('lowers the ratio so an extreme viewport stays within the pixel budget', () => {
    const dpr = budgetDpr(1350, 16_384, 1);
    expect(dpr).toBeLessThan(1);
    expect(1350 * 16_384 * dpr * dpr).toBeCloseTo(MAX_CANVAS_PIXELS, -2);
  });

  it('leaves the ratio alone for an empty canvas', () => {
    expect(budgetDpr(0, 0, 1.5)).toBe(1.5);
  });
});
