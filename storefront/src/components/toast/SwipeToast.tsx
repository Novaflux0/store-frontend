'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { CloseIcon } from '@/components/layout/NavIcons';

import styles from './SwipeToast.module.css';

/**
 * Swipe-to-dismiss toast with a burning "fuse" timer, adapted from React Bits
 * (reactbits.dev, SwipeToast). Ported to TypeScript; the phase and latest-onClose refs
 * are synced in layout effects instead of during render, and effects read the latest
 * values through `useEffectEvent`;
 * the close icon is inline SVG; `announce` makes a visual-only toast for messages the
 * page already announces. Rendered by <Toaster>, not used directly by pages.
 */

export type ToastCloseReason = 'timeout' | 'swipe' | 'action' | 'close' | 'escape' | 'programmatic';

export interface SwipeToastProps {
  /** The first line. */
  readonly title: ReactNode;
  /** The dimmer second line. Empty hides it. */
  readonly description?: ReactNode;
  /** An 18px icon before the text. */
  readonly icon?: ReactNode;
  /** The inverted button. Empty hides it. */
  readonly actionLabel?: ReactNode;
  /** Called when the action is pressed, before the close. */
  readonly onAction?: () => void;
  /** Flip to false to close from outside; true again re-enters. */
  readonly open?: boolean;
  /** Called after the exit (and after the inline slot collapsed). */
  readonly onClose?: (reason: ToastCloseReason) => void;
  readonly background?: string;
  readonly color?: string;
  readonly fuseColor?: string;
  /** Border colour; transparent by default. */
  readonly edgeColor?: string;
  readonly width?: number;
  readonly radius?: number;
  /** How long the rise and the drop take (ms). */
  readonly slideMs?: number;
  /** Overshoot of the return after an abandoned swipe; 0 stops dead. */
  readonly settleBounce?: number;
  /** How far a slow drag must go before release dismisses; a flick always does. */
  readonly swipeDistance?: number;
  /** Milliseconds until it closes itself; 0 keeps it until dismissed. */
  readonly duration?: number;
  readonly fuse?: 'bottom' | 'top' | 'none';
  readonly pauseOnHover?: boolean;
  readonly closeButton?: boolean;
  /** In flow inside the parent instead of fixed to the bottom-right of the viewport. */
  readonly inline?: boolean;
  /** Off removes the swipe and Escape. */
  readonly dismissible?: boolean;
  /**
   * False: visual only (no live region, not focusable) for messages the page
   * already announces, so screen readers do not hear them twice.
   */
  readonly announce?: boolean;
  readonly className?: string;
}

type Phase = 'open' | 'closing' | 'gone';

interface DragState {
  readonly id: number;
  readonly startY: number;
  grab: number | null;
  moved: boolean;
  readonly hist: [time: number, y: number][];
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const FLICK = 0.11;
const DEAD_ZONE = 3;
const RESIST_PX = 24;
const COLLAPSE_MS = 200;
const EXIT = 0.7;
const BURN: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }];
const HAS_STARTING_STYLE = typeof window !== 'undefined' && 'CSSStartingStyleRule' in window;

const rubberband = (over: number, dim: number, c = 0.55) =>
  (over * dim * c) / (dim + c * Math.abs(over));

function velocityOf(hist: DragState['hist']): number {
  const first = hist[0];
  const last = hist[hist.length - 1];
  if (!first || !last || hist.length < 2) return 0;
  return performance.now() - last[0] > 100
    ? 0
    : (last[1] - first[1]) / Math.max(1, last[0] - first[0]);
}

export function SwipeToast({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  open = true,
  onClose,
  background = '#27272a',
  color = '#f5f5f5',
  fuseColor = '#f5a524',
  edgeColor = 'transparent',
  width = 356,
  radius = 12,
  slideMs = 400,
  settleBounce = 0.2,
  swipeDistance = 40,
  duration = 4000,
  fuse = 'bottom',
  pauseOnHover = true,
  closeButton = false,
  inline = false,
  dismissible = true,
  announce = true,
  className,
}: SwipeToastProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('open');
  const [instant, setInstant] = useState(false);
  const [mounted, setMounted] = useState(HAS_STARTING_STYLE);
  const cardRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<HTMLElement>(null);
  const anim = useRef<Animation | null>(null);
  const drag = useRef<DragState | null>(null);
  const flags = useRef({ hover: false, interacting: false, focus: false, hidden: false });
  const lastInput = useRef<'pointer' | 'keyboard'>('pointer');
  const pendingClose = useRef<ToastCloseReason | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const leaving = useRef(false);
  const phaseRef = useRef<Phase>(phase);

  // Latest onClose for timers and animation callbacks, synced after render (not during it).
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const emitClose = (why: ToastCloseReason) => {
    onCloseRef.current?.(why);
  };

  const y = useMotionValue(0);
  const fade = useMotionValue(1);
  const transform = useTransform(y, (v) => `translateY(${v.toString()}px)`);

  const syncFuse = () => {
    const a = anim.current;
    if (!a) return;
    const f = flags.current;
    if (f.hover || f.interacting || f.focus || f.hidden) a.pause();
    else if (a.playState === 'paused') a.play();
  };

  const finish = (why: ToastCloseReason) => {
    phaseRef.current = 'gone';
    setPhase('gone');
    leaving.current = false;
    if (inline)
      closeTimer.current = setTimeout(() => {
        emitClose(why);
      }, COLLAPSE_MS);
    else emitClose(why);
  };

  const close = (why: ToastCloseReason) => {
    if (phaseRef.current !== 'open' || leaving.current) return;
    if (drag.current) {
      pendingClose.current = why;
      return;
    }
    anim.current?.pause();
    const now =
      why === 'escape' ||
      ((why === 'action' || why === 'close') && lastInput.current === 'keyboard');
    setInstant(now);
    phaseRef.current = 'closing';
    setPhase('closing');
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(
      () => {
        finish(why);
      },
      now ? 0 : slideMs * EXIT + 60,
    );
  };

  const rescue = () => {
    clearTimeout(closeTimer.current);
    setInstant(false);
    y.set(0);
    fade.set(1);
    phaseRef.current = 'open';
    setPhase('open');
  };

  const onOpenChange = useEffectEvent((isOpen: boolean) => {
    if (!isOpen) close('programmatic');
    else if (phaseRef.current !== 'open') rescue();
  });
  useEffect(() => {
    onOpenChange(open);
  }, [open]);

  useEffect(() => {
    if (HAS_STARTING_STYLE) return undefined;
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  const onFuseDone = useEffectEvent(() => {
    close('timeout');
  });
  const resyncFuse = useEffectEvent(syncFuse);
  useEffect(() => {
    if (phase !== 'open' || duration <= 0 || !fuseRef.current) return undefined;
    anim.current?.cancel();
    const a = fuseRef.current.animate(BURN, { duration, easing: 'linear', fill: 'forwards' });
    a.onfinish = () => {
      onFuseDone();
    };
    anim.current = a;
    resyncFuse();
    return () => {
      a.onfinish = null;
      a.pause();
    };
  }, [phase, duration]);

  useEffect(() => {
    if (pauseOnHover) return;
    flags.current.hover = false;
    resyncFuse();
  }, [pauseOnHover]);

  useEffect(() => {
    const onVisibility = () => {
      flags.current.hidden = document.hidden;
      resyncFuse();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(closeTimer.current);
      anim.current?.cancel();
    };
  }, []);

  const swipeOut = (dy: number, v: number) => {
    anim.current?.pause();
    leaving.current = true;
    pendingClose.current = null;
    if (!reduce && cardRef.current) {
      void animate(y, dy + cardRef.current.offsetHeight, {
        type: 'spring',
        duration: 0.3,
        bounce: 0,
        velocity: v * 1000,
      });
    }
    void animate(fade, 0, { duration: 0.2, ease: EASE_OUT }).then(() => {
      finish('swipe');
    });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    lastInput.current = 'pointer';
    if (e.button !== 0 || !dismissible || drag.current || leaving.current) return;
    if (e.target instanceof Element && e.target.closest('button')) return;
    if (phaseRef.current === 'closing') rescue();
    try {
      cardRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // The pointer may already be gone; capture is a nicety.
    }
    y.stop();
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      grab: null,
      moved: false,
      hist: [[performance.now(), y.get()]],
    };
    flags.current.interacting = true;
    syncFuse();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d?.id !== e.pointerId) return;
    if (d.grab === null) {
      if (Math.abs(e.clientY - d.startY) < DEAD_ZONE) return;
      d.grab = e.clientY - y.get();
      if (cardRef.current) cardRef.current.dataset.swiping = '';
    }
    const raw = e.clientY - d.grab;
    const next = raw >= 0 ? raw : rubberband(raw, RESIST_PX);
    y.set(next);
    d.moved = true;
    d.hist.push([performance.now(), next]);
    if (d.hist.length > 4) d.hist.shift();
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d?.id !== e.pointerId) return;
    drag.current = null;
    if (cardRef.current) delete cardRef.current.dataset.swiping;
    try {
      cardRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
    flags.current.interacting = false;
    const dy = y.get();
    const v = velocityOf(d.hist);
    if (dy > 0 && (v > FLICK || (dy >= swipeDistance && v >= 0))) {
      swipeOut(dy, v);
      return;
    }
    if (d.moved) {
      void animate(
        y,
        0,
        reduce
          ? { duration: 0.2, ease: EASE_OUT }
          : { type: 'spring', duration: 0.5, bounce: settleBounce, velocity: v * 1000 },
      );
    }
    const queued = pendingClose.current;
    pendingClose.current = null;
    if (queued) close(queued);
    else syncFuse();
  };

  const vars = {
    '--st-bg': background,
    '--st-ink': color,
    '--st-fuse': fuseColor,
    '--st-edge': edgeColor,
    '--st-w': `${width.toString()}px`,
    '--st-radius': `${radius.toString()}px`,
    '--st-slide': `${slideMs.toString()}ms`,
    '--st-gap': '10px',
  } as CSSProperties;

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-phase={phase}
      data-inline={inline ? 'true' : 'false'}
      data-fuse={duration > 0 ? fuse : 'none'}
      data-dismissible={dismissible ? 'true' : 'false'}
      data-instant={instant ? '' : undefined}
      data-mounted={mounted ? 'true' : 'false'}
      style={vars}
    >
      <div className={styles.gate}>
        <div className={styles.lift}>
          <motion.div
            ref={cardRef}
            className={styles.card}
            {...(announce
              ? { role: 'status', 'aria-live': 'polite', 'aria-atomic': true, tabIndex: 0 }
              : { 'aria-hidden': true })}
            style={{ transform, opacity: fade }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerEnter={(e) => {
              if (pauseOnHover && e.pointerType === 'mouse') {
                flags.current.hover = true;
                syncFuse();
              }
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') {
                flags.current.hover = false;
                syncFuse();
              }
            }}
            onFocus={() => {
              flags.current.focus = true;
              syncFuse();
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                flags.current.focus = false;
                syncFuse();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') lastInput.current = 'keyboard';
              if (e.key === 'Escape' && dismissible) {
                e.stopPropagation();
                close('escape');
              }
            }}
          >
            {icon ? (
              <span className={styles.icon} aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <span className={styles.body}>
              <span className={styles.title}>{title}</span>
              {description ? <span className={styles.desc}>{description}</span> : null}
            </span>
            {actionLabel && announce ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  onAction?.();
                  close('action');
                }}
              >
                {actionLabel}
              </button>
            ) : null}
            {closeButton && announce ? (
              <button
                type="button"
                className={styles.close}
                aria-label="Close"
                onClick={() => {
                  close('close');
                }}
              >
                <CloseIcon className="size-3" strokeWidth={2.5} />
              </button>
            ) : null}
            <i ref={fuseRef} className={styles.fuse} aria-hidden="true" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
