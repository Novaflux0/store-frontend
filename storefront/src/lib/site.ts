import type { Route } from 'next';

/**
 * What stays in code now that the brand, contact details and navigation come from
 * the CMS settings (ADR 0014): the locale and the list of static routes.
 */

export const SITE_LOCALE = 'en_US';

/** A navigation link from the `navigation` settings (a site path or a full URL). */
export interface NavItem {
  readonly href: string;
  readonly label: string;
}

/** Every statically generated public route, used by `sitemap.ts`. */
export const PUBLIC_ROUTES: readonly Route[] = [
  '/',
  '/services',
  '/portfolio',
  '/pricing',
  '/about',
  '/blog',
  '/careers',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
];
