import { z } from 'zod';

import { EMPLOYMENT_TYPES, PRICE_PERIODS } from '../admin-options.js';
import { SERVICE_OPTIONS } from '../lead-options.js';
import { richTextDocSchema } from '../rich-text.js';
import {
  blogCategoryRefSchema,
  coverImageSchema,
  currencySchema,
  descriptionSchema,
  faqSchema,
  hrefSchema,
  imageSchema,
  isoDateSchema,
  jobLocationSchema,
  salarySchema,
  seoOverrideSchema,
  shortTextSchema,
  summarySchema,
  tagsSchema,
  teamMemberRefSchema,
  youtubeIdSchema,
} from './fields.js';

/**
 * The `data` of each collection content type. `title` and `slug` are columns of
 * the entry itself (shared by every type), so they are not repeated here.
 */

export const blogPostDataSchema = z.strictObject({
  description: descriptionSchema,
  /** Shown as the publication date; defaults to the first publish date in the dashboard. */
  date: isoDateSchema,
  category: blogCategoryRefSchema.optional(),
  tags: tagsSchema.default([]),
  /** A team member, shown with their role and linked as the schema.org author. */
  authorRef: teamMemberRefSchema.optional(),
  /** A free-text byline for guest authors (used when no team member is chosen). */
  author: z.string().trim().min(1).max(100).optional(),
  cover: coverImageSchema.optional(),
  body: richTextDocSchema,
  /** Show a table of contents built from the H2 and H3 headings. */
  tableOfContents: z.boolean().default(true),
  /** Listed in the home page's blog section. */
  featured: z.boolean().default(false),
  faq: faqSchema.optional(),
  seo: seoOverrideSchema.optional(),
});

export const blogCategoryDataSchema = z.strictObject({
  description: descriptionSchema,
  seo: seoOverrideSchema.optional(),
});

export const caseStudyDataSchema = z.strictObject({
  description: descriptionSchema,
  date: isoDateSchema,
  tags: tagsSchema.default([]),
  client: z.string().trim().min(1).max(100),
  services: z.array(z.enum(SERVICE_OPTIONS)).min(1, 'Choose at least one service.'),
  /** Headline outcomes, e.g. "Conversion up 32%". */
  results: z.array(z.string().trim().min(1).max(160)).min(1).max(6),
  cover: imageSchema,
  /** Featured case studies are shown on the home page first. */
  featured: z.boolean().default(false),
  body: richTextDocSchema,
  seo: seoOverrideSchema.optional(),
});

export const jobDataSchema = z
  .strictObject({
    description: descriptionSchema,
    tags: tagsSchema.default([]),
    location: jobLocationSchema,
    employmentType: z.enum(EMPLOYMENT_TYPES),
    department: z.string().trim().min(1).max(100),
    datePosted: isoDateSchema,
    /** After this date the role is closed and hidden from the site. */
    validThrough: isoDateSchema,
    salary: salarySchema.optional(),
    body: richTextDocSchema,
  })
  .refine((job) => job.validThrough > job.datePosted, {
    message: 'The closing date must be after the posting date.',
    path: ['validThrough'],
  });

export const serviceDataSchema = z.strictObject({
  /** Links the service to the contact form option and to case studies. */
  serviceKey: z.enum(SERVICE_OPTIONS),
  summary: summarySchema,
  deliverables: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  body: richTextDocSchema.optional(),
  /** Listed in the home page's services section. */
  featured: z.boolean().default(false),
});

export const teamMemberDataSchema = z.strictObject({
  role: shortTextSchema,
  bio: z.string().trim().max(600).optional(),
  photo: imageSchema.optional(),
  /** Profile links, shown as icon buttons on the home page's team card. */
  socials: z
    .strictObject({
      facebook: hrefSchema.optional(),
      instagram: hrefSchema.optional(),
      whatsapp: hrefSchema.optional(),
    })
    .optional(),
});

export const testimonialDataSchema = z.strictObject({
  quote: z.string().trim().min(1).max(600),
  author: shortTextSchema,
  role: shortTextSchema,
  company: shortTextSchema,
  /** Portrait in the home page carousel. */
  photo: imageSchema.optional(),
  /** Out of 5, shown as "Grade 5.0" with stars. */
  rating: z.number().min(1).max(5).optional(),
  video: z
    .strictObject({
      youtubeId: youtubeIdSchema,
      poster: imageSchema,
    })
    .optional(),
  /** Shown in the home page's testimonials section. */
  featured: z.boolean().default(false),
});

/** One question of the FAQ page; the entry title is the question. */
export const faqDataSchema = z.strictObject({
  answer: z.string().trim().min(1, 'Enter the answer.').max(1000),
  /** Also shown in the home page's FAQ section. */
  featured: z.boolean().default(false),
});

export const pricingPlanDataSchema = z.strictObject({
  summary: summarySchema,
  /** Leave empty for "Custom quote"; `from` shows "From €4,900". */
  price: z
    .strictObject({
      currency: currencySchema,
      amount: z.number().nonnegative().max(10_000_000),
      period: z.enum(PRICE_PERIODS),
      from: z.boolean().default(false),
    })
    .optional(),
  /** Shown instead of a price when there is none, e.g. "Let's talk". */
  priceNote: z.string().trim().max(40).optional(),
  features: z.array(z.string().trim().min(1).max(120)).min(1).max(15),
  highlighted: z.boolean().default(false),
  cta: z.strictObject({
    label: z.string().trim().min(1).max(40),
    href: hrefSchema,
  }),
});

export type BlogPostData = z.infer<typeof blogPostDataSchema>;
export type BlogCategoryData = z.infer<typeof blogCategoryDataSchema>;
export type FaqData = z.infer<typeof faqDataSchema>;
export type CaseStudyData = z.infer<typeof caseStudyDataSchema>;
export type JobData = z.infer<typeof jobDataSchema>;
export type ServiceData = z.infer<typeof serviceDataSchema>;
export type TeamMemberData = z.infer<typeof teamMemberDataSchema>;
export type TestimonialData = z.infer<typeof testimonialDataSchema>;
export type PricingPlanData = z.infer<typeof pricingPlanDataSchema>;
