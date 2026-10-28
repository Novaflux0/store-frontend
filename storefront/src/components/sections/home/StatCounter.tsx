'use client';

import { useEffect, useRef } from 'react';

import { easeOutCubic, formatStat } from './format-stat';

const DURATION_MS = 1600;

export interface StatCounterProps {
  readonly value: number;
  readonly decimals: number;
  readonly suffix: string;
}

/**
 * A number that counts up when it scrolls into view. The server HTML and assistive
 * technology always get the final value; only the decorative copy animates. Skipped
 * under reduced motion and when the number is already on screen at hydration (it
 * would flash back to zero).
 */
export function StatCounter({ value, decimals, suffix }: StatCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatStat(value, decimals, suffix);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    element.textContent = formatStat(0, decimals, suffix);
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const progress = (now - start) / DURATION_MS;
          element.textContent = formatStat(value * easeOutCubic(progress), decimals, suffix);
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      element.textContent = formatStat(value, decimals, suffix);
    };
  }, [value, decimals, suffix]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </>
  );
}
