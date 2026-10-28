import type { ReactNode } from 'react';

import { cx } from '@agency/ui';

import { RevealHeading } from '@/components/animation/RevealHeading';

export interface SectionHeadingProps {
  /** Id of the `<h2>`; the section points at it with `aria-labelledby`. */
  readonly id: string;
  readonly eyebrow: string;
  readonly title: ReactNode;
  readonly children?: ReactNode;
  readonly align?: 'start' | 'center';
}

/** Eyebrow, scroll-revealed `<h2>` and an optional intro: the top of every home section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  children,
  align = 'start',
}: SectionHeadingProps) {
  const centered = align === 'center';
  return (
    <div className={cx('max-w-2xl', centered && 'mx-auto text-center')}>
      <p className="mb-4 font-display text-sm tracking-[0.25em] text-neon-cyan uppercase">
        {eyebrow}
      </p>
      <RevealHeading id={id} className="text-3xl font-semibold tracking-tight text-fg md:text-5xl">
        {title}
      </RevealHeading>
      {children ? <p className="mt-4 text-lg text-muted">{children}</p> : null}
    </div>
  );
}
