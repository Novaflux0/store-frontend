import 'server-only';

import type { Metadata } from 'next';

import { getSettings, getStandardPage, type StandardPageSlug } from '@/content/registry';

import { orFallback, pageMetadata } from './metadata';

/**
 * Metadata for a page whose copy lives in the CMS (`page` entries): the SEO
 * overrides from the dashboard win, otherwise the code's defaults apply.
 */
export async function standardPageMetadata(
  slug: StandardPageSlug,
  path: string,
  fallback: { readonly title: string; readonly description: string },
): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getStandardPage(slug)]);
  const seo = page?.data.seo;
  return pageMetadata(
    {
      title: orFallback(seo?.title, fallback.title),
      description: orFallback(seo?.description, fallback.description),
      path,
      seo,
    },
    settings,
  );
}
