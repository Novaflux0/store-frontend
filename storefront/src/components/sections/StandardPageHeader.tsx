import type { StandardPageData } from '@agency/validation';

import { getStandardPage, type StandardPageSlug } from '@/content/registry';

import { PageHeader } from './PageHeader';

export interface StandardPageHeaderProps {
  readonly slug: StandardPageSlug;
  /** Used until the page's copy exists in the CMS (it is seeded, so normally never). */
  readonly fallback: Pick<StandardPageData, 'heading' | 'intro'> & { readonly eyebrow?: string };
}

/** The page intro (eyebrow, the page's `<h1>`, intro paragraph) from the page's CMS entry. */
export async function StandardPageHeader({ slug, fallback }: StandardPageHeaderProps) {
  const page = (await getStandardPage(slug))?.data ?? fallback;
  return (
    <PageHeader {...(page.eyebrow ? { eyebrow: page.eyebrow } : {})} title={page.heading}>
      {page.intro}
    </PageHeader>
  );
}
