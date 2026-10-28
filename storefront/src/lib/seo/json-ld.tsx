import type { SiteSettings } from '@agency/validation';

import { siteUrl } from '@/lib/env/client';

/** The site settings the structured data needs. */
export type JsonLdSite = Pick<
  SiteSettings,
  'name' | 'legalName' | 'email' | 'description' | 'phone' | 'address' | 'social'
>;

/** A JSON-LD document: plain JSON values only. */
export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type JsonLdDocument = Readonly<Record<string, JsonValue>> & {
  readonly '@context': 'https://schema.org';
};

/**
 * Serialises JSON-LD for an inline `<script>`. `<`, `>` and `&` become Unicode
 * escapes, so a value containing `</script>` can never close the tag early.
 */
export function serializeJsonLd(data: JsonLdDocument): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Structured data block. The JSON is rendered as the script's text child (React
 * does not HTML-escape `<script>` content), so `dangerouslySetInnerHTML` is not needed.
 */
export function JsonLd({ data }: { readonly data: JsonLdDocument }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}

function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}

export function organizationJsonLd(site: JsonLdSite): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    legalName: site.legalName,
    url: absoluteUrl('/'),
    email: site.email,
    description: site.description,
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(site.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: site.address.street,
            addressLocality: site.address.city,
            addressCountry: site.address.country,
            ...(site.address.region ? { addressRegion: site.address.region } : {}),
            ...(site.address.postalCode ? { postalCode: site.address.postalCode } : {}),
          },
        }
      : {}),
    sameAs: site.social.map((profile) => profile.url),
  };
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

/** schema.org `FAQPage`; the same questions and answers must be visible on the page. */
export function faqPageJsonLd(faqs: readonly FaqItem[]): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  readonly path: string;
}

export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function organizationRef(site: Pick<SiteSettings, 'name'>): JsonValue {
  return { '@type': 'Organization', name: site.name, url: absoluteUrl('/') };
}

export interface ArticleInput {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  /** `YYYY-MM-DD`. */
  readonly datePublished: string;
  /** When the live version last changed (ISO date-time). */
  readonly dateModified?: string | undefined;
  /** A team member (a Person) or a free-text byline; the studio when neither is set. */
  readonly author?: string | { readonly name: string; readonly jobTitle: string } | undefined;
  readonly tags: readonly string[];
  /** The cover (an absolute media URL or a site path). */
  readonly image?: string | undefined;
  /** The category's name. */
  readonly section?: string | undefined;
  readonly wordCount?: number | undefined;
}

function authorRef(author: ArticleInput['author'], site: Pick<SiteSettings, 'name'>): JsonValue {
  if (author === undefined) return organizationRef(site);
  if (typeof author === 'string') return { '@type': 'Organization', name: author };
  return {
    '@type': 'Person',
    name: author.name,
    jobTitle: author.jobTitle,
    url: absoluteUrl('/about'),
  };
}

/** schema.org `BlogPosting` (an `Article` subtype) for a blog post. */
export function articleJsonLd(
  post: ArticleInput,
  site: Pick<SiteSettings, 'name'>,
): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: absoluteUrl(post.path),
    mainEntityOfPage: absoluteUrl(post.path),
    datePublished: post.datePublished,
    ...(post.dateModified === undefined ? {} : { dateModified: post.dateModified }),
    ...(post.image === undefined ? {} : { image: [absoluteUrl(post.image)] }),
    ...(post.section === undefined ? {} : { articleSection: post.section }),
    ...(post.wordCount === undefined ? {} : { wordCount: post.wordCount }),
    author: authorRef(post.author, site),
    publisher: organizationRef(site),
    keywords: post.tags.join(', '),
  };
}

export interface CreativeWorkInput {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly dateCreated: string;
  readonly client: string;
  readonly image: string;
  readonly tags: readonly string[];
}

/** schema.org `CreativeWork` for a case study. */
export function creativeWorkJsonLd(
  work: CreativeWorkInput,
  site: Pick<SiteSettings, 'name'>,
): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: work.title,
    description: work.description,
    url: absoluteUrl(work.path),
    image: absoluteUrl(work.image),
    dateCreated: work.dateCreated,
    creator: organizationRef(site),
    sourceOrganization: { '@type': 'Organization', name: work.client },
    keywords: work.tags.join(', '),
  };
}

export interface JobPostingInput {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly datePosted: string;
  readonly validThrough: string;
  readonly employmentType: string;
  readonly department: string;
  readonly location: {
    readonly type: 'onsite' | 'hybrid' | 'remote';
    readonly city?: string | undefined;
    readonly region?: string | undefined;
    readonly country: string;
  };
  readonly salary?:
    | {
        readonly currency: string;
        readonly min: number;
        readonly max?: number | undefined;
        readonly unit: string;
      }
    | undefined;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * schema.org `JobPosting` with Google's required properties (`title`, `description`,
 * `datePosted`, `hiringOrganization`, `jobLocation` or remote `jobLocationType` plus
 * `applicantLocationRequirements`) and the recommended ones we have (`validThrough`,
 * `employmentType`, `baseSalary`, `identifier`, `directApply`).
 */
export function jobPostingJsonLd(
  job: JobPostingInput,
  site: Pick<SiteSettings, 'name'>,
): JsonLdDocument {
  const address: Record<string, JsonValue> = {
    '@type': 'PostalAddress',
    addressCountry: job.location.country,
    ...(job.location.city ? { addressLocality: job.location.city } : {}),
    ...(job.location.region ? { addressRegion: job.location.region } : {}),
  };
  const location: Record<string, JsonValue> =
    job.location.type === 'remote'
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: job.location.country },
        }
      : { jobLocation: { '@type': 'Place', address } };
  const salary: Record<string, JsonValue> = job.salary
    ? {
        baseSalary: {
          '@type': 'MonetaryAmount',
          currency: job.salary.currency,
          value: {
            '@type': 'QuantitativeValue',
            unitText: job.salary.unit,
            ...(job.salary.max === undefined
              ? { value: job.salary.min }
              : { minValue: job.salary.min, maxValue: job.salary.max }),
          },
        },
      }
    : {};
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    // Google expects HTML; the summary is escaped plain text wrapped in a paragraph.
    description: `<p>${escapeHtml(job.description)}</p>`,
    identifier: { '@type': 'PropertyValue', name: site.name, value: job.slug },
    datePosted: job.datePosted,
    validThrough: `${job.validThrough}T23:59:59Z`,
    employmentType: job.employmentType,
    occupationalCategory: job.department,
    hiringOrganization: {
      '@type': 'Organization',
      name: site.name,
      sameAs: absoluteUrl('/'),
    },
    url: absoluteUrl(job.path),
    directApply: true,
    ...location,
    ...salary,
  };
}
