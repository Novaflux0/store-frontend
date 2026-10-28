'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useIdle } from '@/hooks/useIdle';
import { useInView } from '@/hooks/useInView';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

import { CanvasErrorBoundary } from '../CanvasErrorBoundary';
import { detectDeviceTier, type DeviceTier } from '../device-tier';

// Doc §6.3 rule 1: 3D never runs on the server and lives in its own chunk.
// The hero's static backdrop sits underneath, so the loading state renders nothing.
const JourneyScene = dynamic(() => import('./JourneyScene'), { ssr: false, loading: () => null });

let cachedTier: DeviceTier | undefined;
const noopSubscribe = () => () => undefined;
const getTier = (): DeviceTier => (cachedTier ??= detectDeviceTier());
const getServerTier = (): DeviceTier => 'off';

/** Document offsets of the stage markers inside `root`, in stage order. */
function measureMarkers(root: Element): number[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-journey-stage]'))
    .sort((a, b) => Number(a.dataset.journeyStage) - Number(b.dataset.journeyStage))
    .map((element) => element.getBoundingClientRect().top + window.scrollY);
}

/**
 * The single WebGL canvas behind the home page. It must be the first child of a
 * `relative isolate` wrapper around the sections that carry `data-journey-stage`:
 * an absolute layer spans the wrapper and the canvas is sticky inside it, so the
 * scene stays in view while the sections scroll and leaves with the last one (never
 * over the footer). Skipped entirely under reduced motion, save-data or without
 * WebGL; paused while off-screen or in a hidden tab; isolated by an error boundary.
 */
export function JourneyCanvas() {
  const stickyRef = useRef<HTMLDivElement>(null);
  const markers = useRef<readonly number[]>([]);
  const reducedMotion = usePrefersReducedMotion();
  const tier = useSyncExternalStore(noopSubscribe, getTier, getServerTier);
  const inView = useInView(stickyRef);
  const idle = useIdle();

  const showScene = !reducedMotion && tier !== 'off' && idle;

  // Lets the page style things that only work with the scene, e.g. the bulb's grab cursor.
  useEffect(() => {
    if (!showScene) return;
    document.documentElement.dataset.journey3d = '';
    return () => {
      delete document.documentElement.dataset.journey3d;
    };
  }, [showScene]);

  useEffect(() => {
    const root = stickyRef.current?.parentElement?.parentElement;
    if (!showScene || !root) return;
    const measure = () => {
      markers.current = measureMarkers(root);
    };
    measure();
    // Section heights change with fonts, images, the viewport and the pinned process track.
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, [showScene]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" data-tier={tier}>
      <div ref={stickyRef} className="sticky top-0 h-dvh w-full overflow-clip">
        {showScene ? (
          <CanvasErrorBoundary>
            <JourneyScene tier={tier} active={inView} markers={markers} />
          </CanvasErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
