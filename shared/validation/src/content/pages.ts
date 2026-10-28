import { z } from 'zod';

import { type LegalPageSlug, type PageSlug } from '../admin-options.js';
import { richTextDocSchema } from '../rich-text.js';
import {
  imageSchema,
  isoDateSchema,
  linkSchema,
  logoSchema,
  seoOverrideSchema,
  summarySchema,
  titleSchema,
  youtubeIdSchema,
} from './fields.js';

/**
 * Singleton pages: the home page sections, the header copy of every other public
 * page, and the legal pages. Each slug exists exactly once (seeded) and can only be
 * edited and published, not created or deleted.
 */

/** Header shared by every page: small label, heading and intro paragraph. */
const pageHeaderFields = {
  eyebrow: z.string().trim().max(40).optional(),
  heading: titleSchema,
  intro: z.string().trim().min(1).max(600),
  seo: seoOverrideSchema.optional(),
};

/**
 * The home page. Testimonials, services, team, case studies and posts are their own
 * content types and are not repeated here.
 */
export const homePageDataSchema = z.strictObject({
  hero: z.strictObject({
    /**
     * e.g. "Design with purpose. Build with impact.": the first word is set in the
     * accent serif, and a new line starts after the first sentence.
     */
    headline: z.string().trim().min(1).max(80),
    /** The paragraph under the headline. */
    subtitle: z.string().trim().min(1).max(300).optional(),
    primaryCta: linkSchema,
    secondaryCta: linkSchema.optional(),
    /** Played from the "watch video" badge at the bottom of the hero; no badge without it. */
    video: z.strictObject({ youtubeId: youtubeIdSchema }).optional(),
  }),
  clients: z.array(z.strictObject({ name: titleSchema, logo: logoSchema })).max(24),
  solutions: z
    .array(
      z.strictObject({
        title: titleSchema,
        summary: summarySchema,
        kind: z.enum(['product', 'solution']),
      }),
    )
    .max(8),
  /** Tools we connect a product to, in a circle around the brand mark next to the solutions. */
  integrations: z
    .array(z.strictObject({ name: z.string().trim().min(1).max(40), logo: logoSchema }))
    .max(24)
    .default([]),
  /**
   * "The Result", after the case studies: people joined by dotted lines with a few
   * notes between them. Each person and note fills the next spot of a fixed layout.
   */
  result: z
    .strictObject({
      eyebrow: z.string().trim().min(1).max(40),
      title: titleSchema,
      people: z
        .array(z.strictObject({ name: z.string().trim().min(1).max(60), photo: imageSchema }))
        .max(14),
      notes: z
        .array(
          z.strictObject({
            /** e.g. "Designs look great! 👍" */
            label: z.string().trim().min(1).max(40),
            /** A small logo after the label. */
            icon: logoSchema.optional(),
          }),
        )
        .max(3),
    })
    .optional(),
  stats: z
    .array(
      z.strictObject({
        value: z.number().nonnegative().max(1_000_000),
        /** Shown after the number, e.g. `+` or `%`. */
        suffix: z.string().trim().max(4).default(''),
        decimals: z.int().min(0).max(2).default(0),
        label: z.string().trim().min(1).max(80),
      }),
    )
    .max(6),
  process: z
    .array(
      z.strictObject({
        title: titleSchema,
        summary: summarySchema,
        /** Typical length, e.g. "1 to 2 weeks". */
        duration: z.string().trim().min(1).max(40),
        /** The step's card in "Work Progress"; a plain gradient card without it. */
        image: imageSchema.optional(),
      }),
    )
    .min(3)
    .max(6),
  strengths: z.array(z.strictObject({ title: titleSchema, summary: summarySchema })).max(6),
  /**
   * "Why choose us" comparison: the ways to get a site built (rows) against what
   * matters (columns). The first row is the studio and is highlighted.
   */
  comparison: z.strictObject({
    /** Column headings, e.g. "Speed". */
    criteria: z.array(z.string().trim().min(1).max(24)).min(1).max(6),
    options: z
      .array(
        z.strictObject({
          name: titleSchema,
          summary: z.string().trim().min(1).max(200),
          icon: z.enum(['brand', 'team', 'brush', 'person', 'toolbox']),
          /** ✓ or ✗ for each column, in the same order as the columns. */
          values: z.array(z.boolean()).max(6),
        }),
      )
      .max(6),
  }),
  tech: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1).max(40),
        /** Short role under the name in the stack diagram, e.g. "Database". */
        role: z.string().trim().min(1).max(40).optional(),
        logo: logoSchema,
      }),
    )
    .max(16),
  about: z.strictObject({
    mission: summarySchema,
    body: z.string().trim().min(1).max(800),
    teamPhoto: imageSchema,
  }),
  ctaBanner: z.strictObject({
    title: titleSchema,
    subtitle: z.string().trim().max(160).optional(),
    cta: linkSchema,
  }),
  seo: seoOverrideSchema.optional(),
});

/** Every page except home: the header plus optional highlight cards (e.g. About values). */
export const standardPageDataSchema = z.strictObject({
  ...pageHeaderFields,
  highlights: z
    .array(z.strictObject({ title: titleSchema, summary: summarySchema }))
    .max(6)
    .default([]),
});

export const legalPageDataSchema = z.strictObject({
  /** "Last updated" date shown on the page. */
  lastUpdated: isoDateSchema,
  body: richTextDocSchema,
  seo: seoOverrideSchema.optional(),
});

/** The data schema of a singleton page, chosen by its slug. */
export function pageDataSchemaFor(slug: PageSlug) {
  return slug === 'home' ? homePageDataSchema : standardPageDataSchema;
}

export type HomePageData = z.infer<typeof homePageDataSchema>;
export type StandardPageData = z.infer<typeof standardPageDataSchema>;
export type LegalPageData = z.infer<typeof legalPageDataSchema>;
export type { LegalPageSlug, PageSlug };
