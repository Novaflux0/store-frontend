import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_TOAST_DURATION,
  MAX_TOASTS,
  clearToasts,
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToasts,
  toast,
} from './toast';

afterEach(() => {
  clearToasts();
});

describe('toast store', () => {
  it('adds a toast with defaults and returns its id', () => {
    const id = toast({ title: 'Saved' });
    expect(getToasts()).toEqual([
      {
        id,
        title: 'Saved',
        description: undefined,
        tone: 'info',
        duration: DEFAULT_TOAST_DURATION,
        announce: true,
      },
    ]);
  });

  it('keeps the given options and unique ids', () => {
    const a = toast({
      title: 'A',
      description: 'one',
      tone: 'error',
      duration: 0,
      announce: false,
    });
    const b = toast({ title: 'B' });
    expect(a).not.toBe(b);
    expect(getToasts()[0]).toMatchObject({
      description: 'one',
      tone: 'error',
      duration: 0,
      announce: false,
    });
  });

  it(`keeps only the newest ${MAX_TOASTS.toString()} toasts`, () => {
    for (let i = 1; i <= MAX_TOASTS + 2; i += 1) toast({ title: `T${i.toString()}` });
    expect(getToasts().map((item) => item.title)).toEqual(['T3', 'T4', 'T5']);
  });

  it('dismisses one toast by id and ignores unknown ids', () => {
    const keep = toast({ title: 'Keep' });
    const drop = toast({ title: 'Drop' });
    dismissToast(drop);
    dismissToast(9999);
    expect(getToasts().map((item) => item.id)).toEqual([keep]);
  });

  it('notifies subscribers on every change until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    const id = toast({ title: 'Hi' });
    dismissToast(id);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    toast({ title: 'Again' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify when nothing changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    clearToasts();
    dismissToast(1234);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('returns a stable empty snapshot for the server', () => {
    expect(getServerToasts()).toEqual([]);
    expect(getServerToasts()).toBe(getServerToasts());
  });
});
