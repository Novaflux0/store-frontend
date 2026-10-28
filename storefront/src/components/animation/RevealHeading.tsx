'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { loadGsap } from './load-gsap';

export interface RevealHeadingProps {
  readonly children: ReactNode;
  readonly id?: string;
  readonly className?: string;
}

/**
 * Section heading that slides in on scroll. Follows the doc §6.4 pattern
 * (`gsap.matchMedia('(prefers-reduced-motion: no-preference)')` + ScrollTrigger,
 * reverted on unmount) but loads GSAP lazily instead of through `useGSAP`, so GSAP
 * is not part of the first-load bundle. Animates transform and opacity only.
 */
export function RevealHeading({ children, id, className }: RevealHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let disposed = false;
    let revert: (() => void) | undefined;

    void loadGsap().then(({ gsap }) => {
      if (disposed) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(element, {
          y: 80,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 85%' },
        });
      });
      revert = () => {
        mm.revert();
      };
    });

    return () => {
      disposed = true;
      revert?.();
    };
  }, []);

  return (
    <h2 ref={ref} id={id} className={className}>
      {children}
    </h2>
  );
}
