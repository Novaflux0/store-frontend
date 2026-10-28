import type { Metadata } from 'next';

import { Container } from '@agency/ui';

export const metadata: Metadata = {
  title: 'Client portal',
  robots: { index: false, follow: false },
};

/**
 * Placeholder for the Release 2 client portal (dashboard, projects, files, messages).
 * `proxy.ts` redirects here only when FEATURE_CLIENT_PORTAL is on.
 */
export default function PortalPage() {
  return (
    <main id="main">
      <Container className="section-y">
        <h1 className="text-4xl font-semibold text-fg">Client portal</h1>
        <p className="mt-4 text-muted">Coming in Release 2.</p>
      </Container>
    </main>
  );
}
