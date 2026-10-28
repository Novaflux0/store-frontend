'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * True while the element intersects the viewport and the tab is visible. Used to
 * pause the WebGL render loop when the hero is scrolled away or the tab is hidden.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = '0px',
): boolean {
  const [intersecting, setIntersecting] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setIntersecting(entry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref, rootMargin]);

  useEffect(() => {
    const onVisibility = () => {
      setPageVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return intersecting && pageVisible;
}
