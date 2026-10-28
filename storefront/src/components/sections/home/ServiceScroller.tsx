'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface ServiceScrollerProps {
  /** One text block per service, shown one at a time in the pinned left panel. */
  readonly items: readonly ReactNode[];
  /** The right column: one `[data-service-block]` element per service, in the same order. */
  readonly children: ReactNode;
}

/** Scroll distance over which one service's text slides out and the next slides in. */
const SWAP_RANGE = 280;
/** Where in the viewport a block's top edge triggers the swap, as a share of its height. */
const SWAP_LINE = 0.5;

/**
 * Laptop-and-up layout of the services section: a pinned panel on the left that works
 * as a vertical slider, and the services' illustration blocks scrolling past on the
 * right. As a block's top edge crosses the middle of the viewport, the current text
 * slides up out of the panel's window and the next one slides in after it, scrubbed by
 * the scroll position (so scrolling back reverses it). Under reduced motion the text
 * swaps without sliding. Transforms are written directly, so scrolling never re-renders.
 */
export function ServiceScroller({ items, children }: ServiceScrollerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    const frame = windowRef.current;
    if (!root || !frame) return;
    const slides = Array.from(frame.children) as HTMLElement[];
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-service-block]'));
    let request = 0;

    const update = () => {
      request = 0;
      const line = window.innerHeight * SWAP_LINE;
      // 0 while the first service shows, 1 once the second has fully slid in, and so on.
      let position = 0;
      for (const block of blocks.slice(1)) {
        const progress = (line - block.getBoundingClientRect().top) / SWAP_RANGE + 0.5;
        position += Math.min(Math.max(progress, 0), 1);
      }
      if (reducedMotion) position = Math.round(position);
      const height = frame.clientHeight;
      slides.forEach((slide, i) => {
        slide.style.transform = `translate3d(0, ${((i - position) * height).toFixed(1)}px, 0)`;
      });
    };
    const schedule = () => {
      request ||= requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(request);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="grid grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-16">
      <div className="sticky top-44 self-start">
        {/* The slides share one grid cell, so the window is as tall as the tallest. */}
        <div
          ref={windowRef}
          className="grid overflow-hidden"
          onScroll={(event) => {
            // Focusing a link in a slide that is out of view would scroll the window.
            event.currentTarget.scrollTop = 0;
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="[grid-area:1/1] will-change-transform"
              style={{ transform: `translate3d(0, ${i * 100}%, 0)` }}
              onFocus={() => {
                // Keyboard focus on a service's link brings its illustrations into view.
                const block = rootRef.current?.querySelectorAll('[data-service-block]')[i];
                block?.scrollIntoView({
                  block: 'center',
                  behavior: reducedMotion ? 'auto' : 'smooth',
                });
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-16">{children}</div>
    </div>
  );
}
