import type { Route } from 'next';
import Link from 'next/link';

import { Container, buttonClassName } from '@agency/ui';

export interface CtaBannerProps {
  readonly title?: string;
  readonly subtitle?: string | undefined;
  /** The button; the home page's banner settings can change it. */
  readonly cta?: { readonly label: string; readonly href: string };
}

const DEFAULT_CTA = { label: 'Start a project', href: '/contact' } as const;

export function CtaBanner({
  title = 'Have a project in mind?',
  subtitle = 'Tell us what you are building. We reply within one business day.',
  cta = DEFAULT_CTA,
}: CtaBannerProps) {
  return (
    <Container as="section" aria-labelledby="cta-title" className="section-y">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-16 text-center md:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-neon-violet)_30%,transparent),transparent_60%)]"
        />
        <h2
          id="cta-title"
          className="relative text-3xl font-semibold tracking-tight text-fg md:text-5xl"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted">{subtitle}</p>
        ) : null}
        <div className="relative mt-8 flex justify-center">
          <Link href={cta.href as Route} className={buttonClassName({ size: 'lg' })}>
            {cta.label}
          </Link>
        </div>
      </div>
    </Container>
  );
}
