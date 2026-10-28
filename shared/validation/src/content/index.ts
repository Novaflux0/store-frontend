import { z } from 'zod';

import {
  CONTENT_STATUSES,
  LEGAL_PAGE_SLUGS,
  PAGE_SLUGS,
  type ContentType,
  type PageSlug,
} from '../admin-options.js';
import { cursorQuerySchema, slugSchema } from '../common.js';
import {
  blogCategoryDataSchema,
  blogPostDataSchema,
  caseStudyDataSchema,
  faqDataSchema,
  jobDataSchema,
  pricingPlanDataSchema,
  serviceDataSchema,
  teamMemberDataSchema,
  testimonialDataSchema,
} from './entries.js';
import { titleSchema } from './fields.js';
import { legalPageDataSchema, pageDataSchemaFor } from './pages.js';

export * from './entries.js';
export * from './fields.js';
export * from './pages.js';

/**
 * The data schema of an entry. Pages pick their schema by slug (home has its own
 * sections); every other type has one schema. Unknown page slugs get a schema that
 * always fails, so a typo can never store unvalidated data.
 */
export function contentDataSchema(type: ContentType, slug: string): z.ZodType {
  switch (type) {
    case 'blog-post':
      return blogPostDataSchema;
    case 'blog-category':
      return blogCategoryDataSchema;
    case 'case-study':
      return caseStudyDataSchema;
    case 'job':
      return jobDataSchema;
    case 'service':
      return serviceDataSchema;
    case 'team-member':
      return teamMemberDataSchema;
    case 'testimonial':
      return testimonialDataSchema;
    case 'pricing-plan':
      return pricingPlanDataSchema;
    case 'faq':
      return faqDataSchema;
    case 'page':
      return (PAGE_SLUGS as readonly string[]).includes(slug)
        ? pageDataSchemaFor(slug as PageSlug)
        : z.never('Unknown page.');
    case 'legal-page':
      return (LEGAL_PAGE_SLUGS as readonly string[]).includes(slug)
        ? legalPageDataSchema
        : z.never('Unknown legal page.');
  }
}

/**
 * The type-specific `data` arrives as JSON and is validated a second time against
 * `contentDataSchema(type, slug)` by the API (and by the admin form before submit).
 */
const contentDataInput = z.record(z.string(), z.unknown());

/** Display order in lists (services, team, pricing plans, testimonials); lower first. */
const sortOrderSchema = z.int().min(0).max(10_000);

/** Optimistic concurrency: the version the editor started from (409 when outdated). */
const versionSchema = z.int().min(1);

/** `POST /admin/content/:type`: creates a draft. */
export const createContentSchema = z.strictObject({
  slug: slugSchema,
  title: titleSchema,
  sortOrder: sortOrderSchema.optional(),
  data: contentDataInput,
});

/** `PATCH /admin/content/:type/:id`: saves the draft. */
export const updateContentSchema = z.strictObject({
  version: versionSchema,
  slug: slugSchema.optional(),
  title: titleSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
  data: contentDataInput.optional(),
  /** Saved by the editor while typing: not audited, and revisions are coalesced. */
  autosave: z.boolean().optional(),
});

/** `POST .../publish`, `.../unpublish`, `.../archive`. */
export const contentVersionSchema = z.strictObject({ version: versionSchema });

/** `POST .../schedule`: publish the current draft at a future time. */
export const scheduleContentSchema = z.strictObject({
  version: versionSchema,
  publishAt: z.iso.datetime({ offset: true, error: 'Choose a date and time.' }),
});

/** `GET /admin/content/:type?status=&q=&featured=&cursor=&limit=`. */
export const contentListQuerySchema = cursorQuerySchema.extend({
  status: z.enum(CONTENT_STATUSES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  /** Only entries shown (or not shown) on the home page. */
  featured: z.stringbool().optional(),
});

/** `POST .../feature`: show the entry on the home page, or stop showing it. */
export const featureContentSchema = z.strictObject({
  version: versionSchema,
  featured: z.boolean(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type ContentVersionInput = z.infer<typeof contentVersionSchema>;
export type ScheduleContentInput = z.infer<typeof scheduleContentSchema>;
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;
export type FeatureContentInput = z.infer<typeof featureContentSchema>;
