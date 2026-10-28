import type { ComponentPropsWithoutRef } from 'react';

import { cx } from './cx.js';

/** Hides content visually but keeps it available to screen readers. */
export function VisuallyHidden({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
  return <span className={cx('sr-only', className)} {...props} />;
}
