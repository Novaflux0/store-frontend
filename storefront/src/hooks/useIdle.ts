'use client';

import { useEffect, useState } from 'react';

/**
 * True once the browser has gone idle after hydration, so decorative work (3D, WebGL
 * effects) downloads and starts after the main content. Falls back to a short timeout
 * where `requestIdleCallback` is missing.
 */
export function useIdle(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const done = () => {
      setIdle(true);
    };
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(done, { timeout: 2000 });
      return () => {
        window.cancelIdleCallback(handle);
      };
    }
    const handle = setTimeout(done, 300);
    return () => {
      clearTimeout(handle);
    };
  }, []);
  return idle;
}
