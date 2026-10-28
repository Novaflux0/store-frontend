'use client';

import { useEffect, type ReactNode } from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

import { loadGsap } from './load-gsap';

/**
 * Lenis smooth scrolling driven by GSAP's ticker and synced with ScrollTrigger
 * (doc §6.4). Disabled under `prefers-reduced-motion`. Lenis and GSAP are imported
 * lazily after hydration, so they never block first paint or count toward the
 * first-load JavaScript budget.
 */
export function SmoothScrollProvider({ children }: { readonly children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let disposed = false;
    let teardown: (() => void) | undefined;

    void Promise.all([import('lenis'), loadGsap()]).then(
      ([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
        if (disposed) return;
        const lenis = new Lenis({ autoRaf: false, anchors: true });
        const onScroll = () => {
          ScrollTrigger.update();
        };
        const tick = (time: number) => {
          lenis.raf(time * 1000);
        };
        lenis.on('scroll', onScroll);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        teardown = () => {
          gsap.ticker.remove(tick);
          lenis.off('scroll', onScroll);
          lenis.destroy();
        };
      },
    );

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [reducedMotion]);

  return children;
}
