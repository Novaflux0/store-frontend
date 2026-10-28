import type { ReactNode } from 'react';

import { Container } from '@agency/ui';

export interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly children?: ReactNode;
  /** Shown above the eyebrow and title (breadcrumbs). */
  readonly before?: ReactNode;
}

/** Page intro with the page's only <h1>. */
export function PageHeader({ eyebrow, title, children, before }: PageHeaderProps) {
  return (
    <Container as="header" className="section-y">
      {before}
      {eyebrow ? (
        <p className="mb-4 font-display text-sm tracking-[0.2em] text-neon-cyan uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-fg md:text-6xl">
        {title}
      </h1>
      {children ? <div className="mt-6 max-w-2xl text-lg text-muted">{children}</div> : null}
    </Container>
  );
}
