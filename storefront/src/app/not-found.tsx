import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { after } from 'next/server';

import { Container, buttonClassName } from '@agency/ui';

import { SiteShell } from '@/components/layout/SiteShell';
import {
  firstReport,
  PATHNAME_HEADER,
  reportSeoEvent,
  REQUEST_ID_HEADER,
} from '@/lib/seo/redirects';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  // Reported after the response is sent, for the dashboard's 404 monitor.
  const requestHeaders = await headers();
  const path = requestHeaders.get(PATHNAME_HEADER);
  const referrer = requestHeaders.get('referer');
  const requestId = requestHeaders.get(REQUEST_ID_HEADER);
  if (path !== null && requestId !== null && firstReport(requestId)) {
    after(() =>
      reportSeoEvent({ kind: 'not-found', path, ...(referrer === null ? {} : { referrer }) }),
    );
  }
  return (
    <SiteShell>
      <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-6 section-y">
        <p className="font-display text-sm tracking-[0.2em] text-neon-cyan uppercase">404</p>
        <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-6xl">
          This page drifted into deep space
        </h1>
        <p className="max-w-xl text-lg text-muted">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className={buttonClassName()}>
            Go to the home page
          </Link>
          <Link href="/contact" className={buttonClassName({ variant: 'ghost' })}>
            Contact us
          </Link>
        </div>
      </Container>
    </SiteShell>
  );
}
