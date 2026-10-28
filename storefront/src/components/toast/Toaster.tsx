'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore, type ReactNode } from 'react';

import { AlertCircleIcon, CheckCircleIcon } from '@/components/layout/NavIcons';
import {
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToasts,
  type ToastTone,
} from '@/lib/toast';

// SwipeToast (and Motion's full animation engine) is its own chunk, downloaded when
// the first toast appears, so toasts add nothing to any page's first-load JavaScript.
const SwipeToast = dynamic(() => import('./SwipeToast').then((mod) => mod.SwipeToast), {
  ssr: false,
  loading: () => null,
});

/** Toasts use the bottom bar's dark surface in both themes, with a tone accent. */
const TONES: Readonly<Record<ToastTone, { fuse: string; icon: ReactNode }>> = {
  success: {
    fuse: 'var(--color-nav-focus)',
    icon: <CheckCircleIcon className="text-nav-focus" />,
  },
  error: {
    fuse: 'var(--color-nav-danger)',
    icon: <AlertCircleIcon className="text-nav-danger" />,
  },
  info: { fuse: 'var(--color-cta)', icon: null },
};

/**
 * Renders the toast queue (src/lib/toast.ts) as a stack above the bottom navigation:
 * bottom-right, clear of the bar and the Back to Top button at every breakpoint.
 * Toasts slide up, burn a fuse while they wait, and can be swiped down to dismiss.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-38 z-[60] flex w-[min(22.25rem,calc(100vw-2rem))] flex-col items-end md:right-6 xl:bottom-28">
      {toasts.map((item) => {
        const tone = TONES[item.tone];
        return (
          <SwipeToast
            key={item.id}
            inline
            className="pointer-events-auto"
            title={item.title}
            description={item.description}
            icon={tone.icon}
            duration={item.duration}
            announce={item.announce}
            background="var(--color-nav)"
            color="var(--color-nav-fg)"
            edgeColor="var(--color-nav-edge)"
            fuseColor={tone.fuse}
            closeButton={item.announce}
            onClose={() => {
              dismissToast(item.id);
            }}
          />
        );
      })}
    </div>
  );
}
