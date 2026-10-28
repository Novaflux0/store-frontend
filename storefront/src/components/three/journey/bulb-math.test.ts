import { describe, expect, it } from 'vitest';

import { BulbInput } from './bulb-input';
import { GLASS_START, bulbLight, bulbProfile, heroPin } from './bulb-math';

describe('bulbProfile', () => {
  const profile = bulbProfile();

  it('runs from the bottom tip to the top of the glass, closed on the axis', () => {
    expect(profile[0]).toEqual([0, 0]);
    expect(profile.at(-1)).toEqual([0, 1]);
    for (let i = 1; i < profile.length; i += 1) {
      expect(profile[i]?.[1]).toBeGreaterThan(profile[i - 1]?.[1] ?? 0);
    }
  });

  it('has a narrow screw base and a wider glass', () => {
    const widest = (from: number, to: number) =>
      Math.max(...profile.filter(([, y]) => y >= from && y < to).map(([r]) => r));
    expect(widest(0, GLASS_START)).toBeLessThan(0.15);
    expect(widest(GLASS_START, 1)).toBeGreaterThan(0.3);
  });
});

describe('bulbLight', () => {
  it('is on, fades out, stays off, flickers and comes back on every 5 seconds', () => {
    expect(bulbLight(1)).toBeGreaterThan(0.85);
    expect(bulbLight(3.2)).toBeGreaterThan(0);
    expect(bulbLight(3.2)).toBeLessThan(1);
    expect(bulbLight(3.8)).toBe(0);
    expect(bulbLight(4.35)).toBe(0.1);
    expect(bulbLight(4.95)).toBe(1);
    expect(bulbLight(6)).toBeCloseTo(bulbLight(1));
  });

  it('stays within 0 and 1, also for negative times', () => {
    for (let t = -10; t < 10; t += 0.05) {
      expect(bulbLight(t)).toBeGreaterThanOrEqual(0);
      expect(bulbLight(t)).toBeLessThanOrEqual(1);
    }
  });
});

describe('heroPin', () => {
  it('pins the bulb to the hand in the hero and releases it into stage 1', () => {
    expect(heroPin(-1)).toBe(1);
    expect(heroPin(0.3)).toBe(1);
    expect(heroPin(0.75)).toBeCloseTo(0.5);
    expect(heroPin(1)).toBe(0);
    expect(heroPin(3)).toBe(0);
  });
});

describe('BulbInput', () => {
  it('collects drag movement between frames and ignores moves when not grabbed', () => {
    const input = new BulbInput();
    input.move(10, 5);
    expect(input.consume()).toEqual({ dx: 0, dy: 0 });

    input.grab();
    input.move(10, 5);
    input.move(-4, 1);
    expect(input.dragging).toBe(true);
    expect(input.consume()).toEqual({ dx: 6, dy: 6 });
    expect(input.consume()).toEqual({ dx: 0, dy: 0 });

    input.release();
    expect(input.dragging).toBe(false);
  });

  it('remembers the anchor element', () => {
    const input = new BulbInput();
    const element = document.createElement('div');
    input.attach(element);
    expect(input.anchor).toBe(element);
    input.attach(null);
    expect(input.anchor).toBeNull();
  });
});
