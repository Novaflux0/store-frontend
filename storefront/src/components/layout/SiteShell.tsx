import { draftMode } from 'next/headers';
import type { ReactNode } from 'react';

import { Toaster } from '@/components/toast/Toaster';
import { getSettings } from '@/content/registry';

import { AnnouncementBanner } from './AnnouncementBanner';
import { BackToTop } from './BackToTop';
import { BottomNav } from './BottomNav';
import { PreviewBanner } from './PreviewBanner';
import { SiteFooter } from './SiteFooter';

/**
 * Skip link + main landmark + footer + fixed bottom navigation, shared by marketing
 * pages and the 404. There is no top header: navigation and the theme toggle live in
 * the bottom bar, and the brand is in the footer. Brand, links and the announcement
 * come from the CMS settings (cached, revalidated on save).
 */
export async function SiteShell({ children }: { readonly children: ReactNode }) {
  const [{ site, navigation, features }, draft] = await Promise.all([getSettings(), draftMode()]);
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-neon-cyan px-5 py-3 font-medium text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      {draft.isEnabled ? <PreviewBanner /> : null}
      {features.announcement.enabled ? (
        <AnnouncementBanner announcement={features.announcement} />
      ) : null}
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter site={site} navigation={navigation} newsletter={features.newsletter} />
      <BottomNav navigation={navigation} />
      <BackToTop />
      <Toaster />
    </>
  );
}
