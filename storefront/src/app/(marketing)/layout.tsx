import type { ReactNode } from 'react';

import { SmoothScrollProvider } from '@/components/animation/SmoothScrollProvider';
import { SiteShell } from '@/components/layout/SiteShell';

/** Public marketing site: statically generated, served from the CDN (ADR 0004). */
export default function MarketingLayout({ children }: { readonly children: ReactNode }) {
  return (
    <SmoothScrollProvider>
      <SiteShell>{children}</SiteShell>
    </SmoothScrollProvider>
  );
}
