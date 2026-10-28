import type { Metadata, Viewport } from 'next';
import { draftMode, headers } from 'next/headers';
import { Instrument_Serif, Inter, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { getSettings } from '@/content/registry';
import { siteUrl } from '@/lib/env/client';
import { NONCE_HEADER } from '@/lib/security/csp';
import { applyTitleTemplate } from '@/lib/seo/metadata';
import { SITE_LOCALE } from '@/lib/site';
import { THEME_COLOR, THEME_SCRIPT } from '@/lib/theme';

import { headingFontVariables } from '@/styles/heading-fonts';

import '@/styles/globals.css';

// next/font downloads the files at build time and serves them from our own origin
// (no requests to Google at runtime; CSP font-src 'self').
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});
// Italic accent words in headings only, so a single italic weight.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  display: 'swap',
  variable: '--font-instrument-serif',
});

/** Site-wide defaults from the CMS settings (brand, SEO title template, description). */
export async function generateMetadata(): Promise<Metadata> {
  const [{ site, seo }, draft] = await Promise.all([getSettings(), draftMode()]);
  return {
    // Draft previews must never be indexed.
    ...(draft.isEnabled ? { robots: { index: false, follow: false } } : {}),
    metadataBase: siteUrl,
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate,
    },
    description: seo.defaultDescription,
    applicationName: site.name,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: site.name,
      locale: SITE_LOCALE,
      url: '/',
      title: applyTitleTemplate(seo.titleTemplate, seo.defaultTitle),
      description: seo.defaultDescription,
      ...(seo.ogImage ? { images: [seo.ogImage.src] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      ...(seo.xHandle ? { site: `@${seo.xHandle}` } : {}),
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR.dark,
  colorScheme: 'dark light',
};

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  // The per-request CSP nonce (proxy.ts). Reading it renders every page per request,
  // which a nonce needs; content API reads stay cached by tag (ADR 0004, nonce update).
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    // The head script may set data-theme before hydration, hence suppressHydrationWarning
    // (it applies to this element's attributes only).
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} ${headingFontVariables}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a stored light theme before first paint. Rendered as text (React does not
            escape <script> content), like JsonLd; allowed by the request's CSP nonce. */}
        <script nonce={nonce}>{THEME_SCRIPT}</script>
      </head>
      <body>
        {/* Without JavaScript, FadeIn content must not stay hidden at opacity 0. */}
        <noscript>
          <style>{'[data-fade-in]{opacity:1!important;transform:none!important}'}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
