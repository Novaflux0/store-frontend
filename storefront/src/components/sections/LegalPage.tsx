import type { LegalPageSlug } from '@agency/validation';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@agency/ui';

import { RichText } from '@/components/content/RichText';
import { formatDate } from '@/content/format';
import { getLegalPage, getSettings } from '@/content/registry';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { orFallback, pageMetadata } from '@/lib/seo/metadata';

import { PageHeader } from './PageHeader';

/**
 * Legal documents (privacy, terms, cookies), edited in the dashboard as `legal-page`
 * entries. The seeded copy is a placeholder.
 * TODO(legal): replace with text approved by legal counsel before launch (doc §16.4).
 */
export async function LegalPage({ slug }: { readonly slug: LegalPageSlug }) {
  const page = await getLegalPage(slug);
  if (!page) notFound();
  const path = `/${slug}`;
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.title, path },
        ])}
      />
      <PageHeader eyebrow="Legal" title={page.title}>
        Last updated {formatDate(page.data.lastUpdated)}.
      </PageHeader>
      <Container className="section-b">
        <div className="max-w-3xl">
          <RichText doc={page.data.body} />
        </div>
      </Container>
    </>
  );
}

/** Metadata of a legal page: the entry's SEO overrides, then its title and a fallback summary. */
export async function legalPageMetadata(
  slug: LegalPageSlug,
  description: (siteName: string) => string,
): Promise<Metadata> {
  const [page, settings] = await Promise.all([getLegalPage(slug), getSettings()]);
  return pageMetadata(
    {
      title: orFallback(page?.data.seo?.title, page?.title ?? slug),
      description: orFallback(page?.data.seo?.description, description(settings.site.name)),
      path: `/${slug}`,
    },
    settings,
  );
}
