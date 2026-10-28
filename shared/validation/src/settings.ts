import { z } from 'zod';

import { SOCIAL_PLATFORMS, type SettingsKey } from './admin-options.js';
import { emailSchema, httpsUrlSchema, phoneSchema } from './common.js';
import { imageSchema, linkSchema } from './content/fields.js';

/**
 * Site settings (ADR 0014), one JSON document per key. Changes apply as soon as
 * they are saved (no draft step), are versioned and audited, and the public keys
 * trigger a storefront revalidation.
 */

const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^\p{Cc}]*$/u, 'Must be a single line.');

/** Company identity and contact details (footer, contact page, JSON-LD Organization). */
export const siteSettingsSchema = z.strictObject({
  name: singleLine(60).min(1),
  legalName: singleLine(120).min(1),
  tagline: singleLine(120).min(1),
  description: z.string().trim().min(1).max(300),
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: z
    .strictObject({
      street: singleLine(120).min(1),
      city: singleLine(80).min(1),
      region: singleLine(80).optional(),
      postalCode: singleLine(20).optional(),
      /** ISO 3166-1 alpha-2. */
      country: z.string().regex(/^[A-Z]{2}$/, 'Use an ISO 3166-1 alpha-2 country code.'),
    })
    .optional(),
  /** e.g. "Mon to Fri, 9:00 to 18:00 CET". */
  hours: singleLine(80).optional(),
  /** Promise shown next to the contact form, e.g. "We reply within one business day". */
  replyTime: singleLine(80).optional(),
  social: z
    .array(z.strictObject({ platform: z.enum(SOCIAL_PLATFORMS), url: httpsUrlSchema }))
    .max(SOCIAL_PLATFORMS.length)
    .default([]),
});

/**
 * The bottom navigation bar: `start` links, the highlighted `cta`, `end` links and
 * a "More" menu. The footer lists start, end and more; `legal` sits under it.
 * `header` holds the links of the top bar in the home page hero, which ends with `cta`.
 */
export const navigationSettingsSchema = z.strictObject({
  header: z.array(linkSchema).max(6).default([]),
  start: z.array(linkSchema).min(1).max(3),
  end: z.array(linkSchema).max(3).default([]),
  more: z.array(linkSchema).max(8).default([]),
  cta: linkSchema,
  legal: z.array(linkSchema).max(5).default([]),
});

/** Defaults for every page; content entries and pages can override title and description. */
export const seoSettingsSchema = z.strictObject({
  /** `%s` is replaced by the page title, e.g. "%s | Agency". */
  titleTemplate: singleLine(70)
    .min(1)
    .refine((value) => value.includes('%s'), 'Include %s where the page title goes.'),
  defaultTitle: singleLine(70).min(1),
  defaultDescription: z.string().trim().min(1).max(160),
  ogImage: imageSchema.optional(),
  /** X (Twitter) handle without `@`. */
  xHandle: z
    .string()
    .trim()
    .regex(/^\w{1,15}$/, 'Use the handle without @.')
    .optional(),
});

/**
 * Runtime switches. The API enforces them (a disabled form returns 503
 * `feature-disabled`), and the storefront hides what is switched off.
 */
export const featureSettingsSchema = z.strictObject({
  contactForm: z.boolean().default(true),
  inquiryForm: z.boolean().default(true),
  newsletter: z.boolean().default(true),
  careersApplications: z.boolean().default(true),
  announcement: z
    .strictObject({
      enabled: z.boolean(),
      message: singleLine(160),
      link: linkSchema.optional(),
    })
    .refine((banner) => !banner.enabled || banner.message.length > 0, {
      message: 'Write the announcement before turning it on.',
      path: ['message'],
    })
    .default({ enabled: false, message: '' }),
});

const recipientsSchema = z.array(emailSchema).min(1, 'Add at least one email address.').max(5);

/** Who receives the notification emails. Never public. */
export const notificationSettingsSchema = z.strictObject({
  leads: recipientsSchema,
  applications: recipientsSchema,
  /** File-scan alerts, new-device logins of staff, failed jobs. */
  security: recipientsSchema,
});

/**
 * Staff security policy (Super Admin only, requires step-up). Every value has a
 * floor and a ceiling, and 2FA is not a setting: it is always required (ADR 0014).
 */
export const securitySettingsSchema = z.strictObject({
  /** Lifetime of a staff session (rotating refresh token), in days. */
  sessionDays: z.int().min(1).max(30).default(7),
  /** How long a step-up (re-authentication) stays valid, in minutes. */
  stepUpMinutes: z.int().min(5).max(30).default(10),
  /** Failed logins before the account is locked. */
  lockoutThreshold: z.int().min(3).max(10).default(5),
  lockoutMinutes: z.int().min(5).max(60).default(15),
  /** Email staff when they sign in from a new device or country. */
  newLoginAlerts: z.boolean().default(true),
});

export const SETTINGS_SCHEMAS = {
  site: siteSettingsSchema,
  navigation: navigationSettingsSchema,
  seo: seoSettingsSchema,
  features: featureSettingsSchema,
  notifications: notificationSettingsSchema,
  security: securitySettingsSchema,
} as const satisfies Record<SettingsKey, z.ZodType>;

/** `PUT /admin/settings/:key`: the whole document plus the version it was based on. */
export const updateSettingsSchema = z.strictObject({
  version: z.int().min(0),
  value: z.record(z.string(), z.unknown()),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type NavigationSettings = z.infer<typeof navigationSettingsSchema>;
export type SeoSettings = z.infer<typeof seoSettingsSchema>;
export type FeatureSettings = z.infer<typeof featureSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type SettingsValue<K extends SettingsKey> = z.infer<(typeof SETTINGS_SCHEMAS)[K]>;
