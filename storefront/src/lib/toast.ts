/**
 * Site-wide toasts: a tiny store that any client component can call with `toast()`.
 * <Toaster> (in SiteShell) renders the queue with SwipeToast. No React here, so the
 * store is cheap to import and easy to test.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  readonly title: string;
  readonly description?: string;
  /** Picks the icon and fuse colour. Defaults to `info`. */
  readonly tone?: ToastTone;
  /** Milliseconds before it closes itself; 0 keeps it until dismissed. */
  readonly duration?: number;
  /**
   * False when the page already announces the same message in its own live region
   * (form status), so screen readers do not hear it twice.
   */
  readonly announce?: boolean;
}

export interface ToastItem {
  readonly id: number;
  readonly title: string;
  readonly description: string | undefined;
  readonly tone: ToastTone;
  readonly duration: number;
  readonly announce: boolean;
}

/** Older toasts are dropped beyond this, so a burst never covers the page. */
export const MAX_TOASTS = 3;
export const DEFAULT_TOAST_DURATION = 5000;

const NO_TOASTS: readonly ToastItem[] = [];

let nextId = 1;
let toasts: readonly ToastItem[] = NO_TOASTS;
const listeners = new Set<() => void>();

function publish(next: readonly ToastItem[]): void {
  toasts = next;
  for (const listener of listeners) listener();
}

/** Shows a toast and returns its id. */
export function toast({
  title,
  description,
  tone = 'info',
  duration = DEFAULT_TOAST_DURATION,
  announce = true,
}: ToastOptions): number {
  const id = nextId++;
  publish([...toasts, { id, title, description, tone, duration, announce }].slice(-MAX_TOASTS));
  return id;
}

/** Removes a toast (SwipeToast calls this after its exit animation). */
export function dismissToast(id: number): void {
  if (toasts.some((item) => item.id === id)) publish(toasts.filter((item) => item.id !== id));
}

/** Removes every toast. */
export function clearToasts(): void {
  if (toasts.length > 0) publish(NO_TOASTS);
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): readonly ToastItem[] {
  return toasts;
}

/** Server snapshot: the server never renders toasts. */
export function getServerToasts(): readonly ToastItem[] {
  return NO_TOASTS;
}
