'use client';

import {
  LazyMotion,
  MotionConfig,
  type MotionStyle,
  useInView,
  useReducedMotion,
} from 'motion/react';
import * as m from 'motion/react-m';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const loadFeatures = () => import('./motion-features').then((mod) => mod.default);

const EASE_FUTURISTIC = [0.16, 1, 0.3, 1] as const;
const HIDDEN = { opacity: 0, y: 24 } as const;
const SHOWN = { opacity: 1, y: 0 } as const;

export interface FadeInProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Seconds before the animation starts (for staggering siblings). */
  readonly delay?: number;
}

/**
 * Fades and lifts content into view once (transform + opacity only).
 *
 * The server-rendered HTML is visible: the entrance on load is a CSS animation
 * (`fade-in-up` in globals.css) that starts with the first paint, so content above
 * the fold never waits for hydration (it would otherwise hold back LCP). After
 * hydration, an element that is still below the fold is hidden while off-screen
 * (`data-fade-scroll` turns the CSS animation off) and Motion reveals it when it
 * scrolls into view. With reduced motion nothing animates: the `[data-fade-in]` rule
 * in globals.css shows the final state, also before hydration.
 */
export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [scrollReveal, setScrollReveal] = useState(false);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });

  useEffect(() => {
    const element = ref.current;
    if (reduceMotion === true || !element) return;
    // Below the fold at hydration: not seen yet, so hiding it causes no flash.
    if (element.getBoundingClientRect().top > window.innerHeight) setScrollReveal(true);
  }, [reduceMotion]);

  const hidden = scrollReveal && !inView;
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <m.div
          ref={ref}
          data-fade-in=""
          data-fade-scroll={scrollReveal ? '' : undefined}
          className={className}
          // A CSS variable for the load animation's stagger (Motion passes it through).
          style={{ '--fade-delay': `${String(delay)}s` } as MotionStyle}
          initial={false}
          animate={hidden ? HIDDEN : SHOWN}
          transition={hidden ? { duration: 0 } : { duration: 0.7, delay, ease: EASE_FUTURISTIC }}
        >
          {children}
        </m.div>
      </MotionConfig>
    </LazyMotion>
  );
}
