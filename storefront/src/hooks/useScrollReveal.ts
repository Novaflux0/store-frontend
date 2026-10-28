'use client';

import { type RefObject, useEffect, useState } from 'react';

/**
 * `static` until hydration and for anything already on screen then (it was seen as it
 * is, so it stays), `hidden` for something still below the fold, and `shown` once it
 * scrolls into view. Put it on a `data-` attribute and let CSS play the entrance from
 * `hidden` to `shown`. Under reduced motion, or without IntersectionObserver, it stays
 * `static`.
 */
export function useScrollReveal(ref: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static');

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    setState('hidden');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setState('shown');
        observer.disconnect();
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return state;
}
