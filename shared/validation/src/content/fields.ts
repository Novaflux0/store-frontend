import { z } from 'zod';

import { SALARY_UNITS } from '../admin-options.js';
import { FIELD_LIMITS } from '../limits.js';

/** Building blocks shared by the content type schemas. */

/** Calendar date `YYYY-MM-DD` (ISO 8601). */
export const isoDateSchema = z.iso.date('Use a YYYY-MM-DD date.');

export const titleSchema = z.string().trim().min(1, 'Enter a title.').max(120);
export const summarySchema = z.string().trim().min(1).max(400);
/** One or two sentences: list cards, `<meta name="description">` and Open Graph. */
export const descriptionSchema = z.string().trim().min(1, 'Enter a description.').max(300);
export const shortTextSchema = z.string().trim().min(1).max(80);

export const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(10);

/**
 * An image: a site-relative `/public` path (seed content) or a URL from the media
 * library, with its intrinsic size so the page does not shift while loading. The
 * API additionally checks that every absolute URL starts with its media host
 * (https in production; http only for local MinIO).
 */
export const imageSchema = z.strictObject({
  src: z
    .string()
    .trim()
    .max(FIELD_LIMITS.urlMax)
    .regex(
      // No quotes, parentheses, semicolons or backslashes: an image URL may end up in a
      // CSS `url()` (e.g. the mask logos) and must not be able to close it.
      /^(?:\/(?!\/)[\w./-]+\.(?:avif|webp|png|jpe?g|svg)|https?:\/\/[^\s"'()\\;]+)$/,
      'Choose an image from the media library.',
    ),
  alt: z.string().trim().min(1, 'Describe the image for screen readers.').max(200),
  width: z.int().positive().max(10_000),
  height: z.int().positive().max(10_000),
});
export type ContentImage = z.infer<typeof imageSchema>;

/**
 * A logo, rendered as a CSS mask so it takes the theme's text colour: an SVG in
 * `/public` or a transparent image from the media library.
 */
export const logoSchema = imageSchema;

/** A link target: a site path such as `/contact`, an in-page anchor or a full https URL. */
export const hrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(FIELD_LIMITS.urlMax)
  .regex(
    /^(?:\/(?!\/)[\w\-./?=&#%]*|#[\w-]+|https:\/\/[^\s]+)$/,
    'Use a site path like /contact or an https:// link.',
  );

export const linkSchema = z.strictObject({
  label: z.string().trim().min(1).max(40),
  href: hrefSchema,
});
export type ContentLink = z.infer<typeof linkSchema>;

/** The 11-character YouTube video id (played from youtube-nocookie.com). */
export const youtubeIdSchema = z
  .string()
  .regex(/^[\w-]{11}$/, 'Use an 11-character YouTube video id.');

/** ISO 4217 currency code, e.g. `EUR`. */
export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Use an ISO 4217 currency code.');

export const salarySchema = z
  .strictObject({
    currency: currencySchema,
    min: z.number().positive(),
    max: z.number().positive().optional(),
    unit: z.enum(SALARY_UNITS),
  })
  .refine((salary) => salary.max === undefined || salary.max >= salary.min, {
    message: 'max must be at least min.',
    path: ['max'],
  });

export const jobLocationSchema = z
  .strictObject({
    /** `remote` becomes `jobLocationType: TELECOMMUTE` in JobPosting. */
    type: z.enum(['onsite', 'hybrid', 'remote']),
    city: z.string().trim().min(1).max(100).optional(),
    region: z.string().trim().min(1).max(100).optional(),
    /** ISO 3166-1 alpha-2, e.g. `DE`. For remote roles: where applicants must live. */
    country: z.string().regex(/^[A-Z]{2}$/, 'Use an ISO 3166-1 alpha-2 country code.'),
  })
  .refine((location) => location.type === 'remote' || location.city !== undefined, {
    message: 'On-site and hybrid roles need a city.',
    path: ['city'],
  });

/** A canonical URL: a site path such as `/blog/guide` or a full https URL on another site. */
export const canonicalUrlSchema = z
  .string()
  .trim()
  .max(FIELD_LIMITS.urlMax)
  .regex(
    /^(?:\/(?![/\\])[\w\-./]*|https:\/\/[^\s]+)$/,
    'Use a site path like /blog/guide or an https:// link.',
  );

/** Card title, description and image for Open Graph (Facebook, LinkedIn) or X. */
export const socialCardSchema = z.strictObject({
  title: z.string().trim().max(95).optional(),
  description: z.string().trim().max(200).optional(),
  image: imageSchema.optional(),
});

/**
 * Per-page SEO overrides. Every field is optional: empty fields fall back to the page
 * title and description, the SEO settings, and for social cards to the SEO fields.
 */
export const seoOverrideSchema = z.strictObject({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(160).optional(),
  /** The search phrase the page should rank for; drives the dashboard's SEO checks. */
  focusKeyword: z.string().trim().max(60).optional(),
  /** Only when this page duplicates another URL; by default a page is its own canonical. */
  canonical: canonicalUrlSchema.optional(),
  robots: z
    .strictObject({
      index: z.boolean().default(true),
      follow: z.boolean().default(true),
    })
    .optional(),
  openGraph: socialCardSchema.optional(),
  x: socialCardSchema.extend({ title: z.string().trim().max(70).optional() }).optional(),
});
export type SeoOverride = z.infer<typeof seoOverrideSchema>;

/**
 * A cover image: an image plus an optional title, caption and link, so the cover can
 * lead somewhere (a landing page, a download) when clicked.
 */
export const coverImageSchema = imageSchema.extend({
  title: z.string().trim().max(200).optional(),
  caption: z.string().trim().max(300).optional(),
  href: hrefSchema.optional(),
  newTab: z.boolean().optional(),
});
export type CoverImage = z.infer<typeof coverImageSchema>;

/**
 * A reference to another entry by slug (a blog category, a team member). The form
 * renders a select of the entries of that type; the API checks the entry exists.
 */
export const blogCategoryRefSchema = z.string().trim().min(1).max(100);
export const teamMemberRefSchema = z.string().trim().min(1).max(100);

/** Questions and answers shown on the page and published as FAQPage structured data. */
export const faqSchema = z
  .array(
    z.strictObject({
      question: z.string().trim().min(1).max(200),
      answer: z.string().trim().min(1).max(1000),
    }),
  )
  .max(20);
