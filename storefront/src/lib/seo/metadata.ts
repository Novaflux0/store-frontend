import type { ContentImage, SeoOverride, SeoSettings, SiteSettings } from '@agency/validation';
import type { Metadata } from 'next';

import { SITE_LOCALE } from '@/lib/site';

/** The settings a page's metadata needs (from `getSettings()`). */
export interface MetadataSettings {
  readonly site: Pick<SiteSettings, 'name'>;
  readonly seo: Pick<SeoSettings, 'titleTemplate'> & Partial<Pick<SeoSettings, 'xHandle'>>;
}

export interface PageMetadataInput {
  /** Page title; the root layout's template (SEO settings) wraps it. */
  readonly title: string;
  readonly description: string;
  readonly path: string;
  /** Legal placeholders, previews and other pages that should not be indexed. */
  readonly noIndex?: boolean;
  /** Blog posts: Open Graph `article` with its publication date and tags. */
  readonly article?: {
    readonly publishedTime: string;
    readonly modifiedTime?: string | undefined;
    readonly section?: string | undefined;
    readonly tags: readonly string[];
  };
  /** Social image (an absolute media URL or a site path, or a media-library image). */
  readonly image?: string | ContentImage | undefined;
  /**
   * The page's SEO overrides from the CMS: canonical URL, robots, and the Open Graph
   * and X cards. `title` and `description` are resolved by the caller (`orFallback`).
   */
  readonly seo?: SeoOverride | undefined;
}

type SocialImage = string | { url: string; width: number; height: number; alt: string };

function socialImage(image: string | ContentImage): SocialImage {
  return typeof image === 'string'
    ? image
    : { url: image.src, width: image.width, height: image.height, alt: image.alt };
}

/** The first non-empty CMS value. */
function firstOf(...values: (string | undefined)[]): string | undefined {
  return values.find((value) => value !== undefined && value !== '');
}

/** `%s | Agency` with the page title; the template is validated to contain `%s`. */
export function applyTitleTemplate(template: string, title: string): string {
  return template.replace('%s', title);
}

/**
 * Robots for a page. Indexable pages get no tag at all (the default), which also keeps
 * the root layout's `noindex, nofollow` of a draft preview in force.
 */
function robotsFor(noIndex: boolean | undefined, seo: SeoOverride | undefined) {
  const index = noIndex !== true && seo?.robots?.index !== false;
  const follow = seo?.robots?.follow !== false;
  return index && follow ? {} : { robots: { index, follow } };
}

/**
 * Metadata for a page: title, description, canonical URL, robots and the Open Graph
 * and X cards. Social fields fall back from X to Open Graph to the page's own.
 */
export function pageMetadata(
  { title, description, path, noIndex, article, image, seo }: PageMetadataInput,
  settings: MetadataSettings,
): Metadata {
  const fullTitle = applyTitleTemplate(settings.seo.titleTemplate, title);
  const ogTitle = firstOf(seo?.openGraph?.title) ?? fullTitle;
  const ogDescription = firstOf(seo?.openGraph?.description) ?? description;
  const ogImage = seo?.openGraph?.image ?? image;
  const xImage = seo?.x?.image ?? ogImage;
  const common = {
    siteName: settings.site.name,
    locale: SITE_LOCALE,
    url: path,
    title: ogTitle,
    description: ogDescription,
    ...(ogImage === undefined ? {} : { images: [socialImage(ogImage)] }),
  };
  return {
    title,
    description,
    alternates: { canonical: firstOf(seo?.canonical) ?? path },
    openGraph: article
      ? {
          ...common,
          type: 'article',
          publishedTime: article.publishedTime,
          ...(article.modifiedTime === undefined ? {} : { modifiedTime: article.modifiedTime }),
          ...(article.section === undefined ? {} : { section: article.section }),
          tags: [...article.tags],
        }
      : { ...common, type: 'website' },
    // Next.js replaces the layout's `twitter` object as a whole, so the site handle is
    // repeated here.
    twitter: {
      card: 'summary_large_image',
      title: firstOf(seo?.x?.title, seo?.openGraph?.title) ?? fullTitle,
      description: firstOf(seo?.x?.description, seo?.openGraph?.description) ?? description,
      ...(xImage === undefined ? {} : { images: [socialImage(xImage)] }),
      ...(settings.seo.xHandle ? { site: `@${settings.seo.xHandle}` } : {}),
    },
    ...robotsFor(noIndex, seo),
  };
}

/** The CMS value unless it is missing or empty (optional SEO fields may be ""). */
export function orFallback(value: string | undefined, fallback: string): string {
  return value === undefined || value === '' ? fallback : value;
}
