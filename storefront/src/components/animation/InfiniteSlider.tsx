'use client';

import { cx } from '@agency/ui';
import { type ReactNode, useEffect, useRef, useState } from 'react';

/** How long hovering takes to ease the speed up or down. */
const RATE_EASE_MS = 600;

export interface InfiniteSliderProps {
  /** List items (`<li>`), rendered twice: the second copy is hidden from assistive technology. */
  readonly children: ReactNode;
  /** Space between items, in CSS pixels. */
  readonly gap?: number;
  /** Pixels per second. */
  readonly speed?: number;
  /** Pixels per second while the pointer is over the slider; unchanged without it. */
  readonly speedOnHover?: number;
  /** Moves left to right instead of right to left. */
  readonly reverse?: boolean;
  readonly className?: string;
  /** Accessible name of the list. */
  readonly label: string;
}

/**
 * An endless row (after motion-primitives' InfiniteSlider): copies of the items slide
 * by one copy's width and loop. There are as many copies as it takes to keep the row
 * full while it slides (at least two), so short lists work in wide containers too.
 * Built on the Web Animations API, so the slide runs on the compositor and no
 * animation library is loaded; hovering eases the playback rate down (and back up),
 * which slows the row without a jump. Under reduced motion the row stands still, wrapped and centred,
 * without the extra copies.
 */
export function InfiniteSlider({
  children,
  gap = 16,
  speed = 100,
  speedOnHover,
  reverse = false,
  className,
  label,
}: InfiniteSliderProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const rateFrameRef = useRef(0);
  const [copies, setCopies] = useState(2);

  useEffect(() => {
    const frame = frameRef.current;
    const track = trackRef.current;
    const first = track?.firstElementChild;
    // Without the Web Animations API (or ResizeObserver) the row simply stands still.
    if (
      !frame ||
      !track ||
      !(first instanceof HTMLElement) ||
      typeof track.animate !== 'function' ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const start = () => {
      animationRef.current?.cancel();
      animationRef.current = null;
      if (reducedMotion.matches) return;
      // One copy plus the gap that follows it: sliding by this loops seamlessly.
      const distance = first.offsetWidth + gap;
      if (first.offsetWidth === 0) return;
      // Enough copies to cover the frame at every point of the loop.
      const needed = Math.max(2, Math.ceil(frame.clientWidth / distance) + 1);
      if (needed !== copies) {
        setCopies(needed);
        return;
      }
      const keyframes = [
        { transform: 'translateX(0)' },
        { transform: `translateX(${String(-distance)}px)` },
      ];
      if (reverse) keyframes.reverse();
      animationRef.current = track.animate(keyframes, {
        duration: (distance / speed) * 1000,
        iterations: Infinity,
        easing: 'linear',
      });
    };

    start();
    // New logo sizes (fonts, images) or a new frame width change the distance or the
    // number of copies; restart with them.
    const resize = new ResizeObserver(start);
    resize.observe(first);
    resize.observe(frame);
    reducedMotion.addEventListener('change', start);
    return () => {
      resize.disconnect();
      reducedMotion.removeEventListener('change', start);
      animationRef.current?.cancel();
    };
  }, [gap, speed, reverse, copies]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rateFrameRef.current);
    },
    [],
  );

  /** Glides the playback rate to `target` (ease-out), so speed changes have no jolt. */
  const easeRate = (target: number) => {
    const animation = animationRef.current;
    if (!animation) return;
    cancelAnimationFrame(rateFrameRef.current);
    const from = animation.playbackRate;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / RATE_EASE_MS);
      // Setting the rate keeps the current position, so the row never skips.
      animation.playbackRate = from + (target - from) * (1 - (1 - t) ** 3);
      if (t < 1) rateFrameRef.current = requestAnimationFrame(step);
    };
    rateFrameRef.current = requestAnimationFrame(step);
  };

  const list = 'flex shrink-0 items-center motion-reduce:flex-wrap motion-reduce:justify-center';
  return (
    <div
      ref={frameRef}
      className={cx('overflow-clip', className)}
      {...(speedOnHover
        ? {
            onPointerEnter: () => {
              easeRate(speedOnHover / speed);
            },
            onPointerLeave: () => {
              easeRate(1);
            },
          }
        : {})}
    >
      <div
        ref={trackRef}
        className="flex w-max motion-reduce:w-auto motion-reduce:justify-center"
        style={{ gap }}
      >
        <ul aria-label={label} className={list} style={{ gap }}>
          {children}
        </ul>
        {Array.from({ length: copies - 1 }, (_, index) => (
          <ul
            key={index}
            aria-hidden="true"
            className={cx(list, 'motion-reduce:hidden')}
            style={{ gap }}
          >
            {children}
          </ul>
        ))}
      </div>
    </div>
  );
}
