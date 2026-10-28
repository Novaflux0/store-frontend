// Zod-free on purpose: re-exported by `@agency/validation/constants` so the admin
// UI can build selects, filters and labels without loading Zod in the browser.

/** CMS content types (ADR 0014). Kebab-case because they appear in URLs. */
export const CONTENT_TYPES = [
  'blog-post',
  'blog-category',
  'case-study',
  'job',
  'service',
  'team-member',
  'testimonial',
  'pricing-plan',
  'faq',
  'page',
  'legal-page',
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/**
 * Content types the home page shows a selection of: each entry has a `featured` flag,
 * set from the dashboard's "Home page" lists (`POST .../feature`).
 */
export const FEATURABLE_CONTENT_TYPES = [
  'service',
  'case-study',
  'testimonial',
  'blog-post',
  'faq',
] as const satisfies readonly ContentType[];
export type FeaturableContentType = (typeof FEATURABLE_CONTENT_TYPES)[number];

/**
 * Content types with a fixed set of entries (one per slug below). They cannot be
 * created or deleted from the dashboard, only edited and published.
 */
export const SINGLETON_CONTENT_TYPES = [
  'page',
  'legal-page',
] as const satisfies readonly ContentType[];

/** Editable page copy: the home page sections and the header of every other page. */
export const PAGE_SLUGS = [
  'home',
  'about',
  'services',
  'pricing',
  'portfolio',
  'blog',
  'careers',
  'contact',
] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const LEGAL_PAGE_SLUGS = ['privacy', 'terms', 'cookies'] as const;
export type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];

/** Draft, then published now or at `scheduledAt`; archived entries are hidden from the site. */
export const CONTENT_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** schema.org `employmentType` values Google accepts for JobPosting. */
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
  'TEMPORARY',
  'INTERN',
  'VOLUNTEER',
  'PER_DIEM',
  'OTHER',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SALARY_UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const;
export type SalaryUnit = (typeof SALARY_UNITS)[number];

export const PRICE_PERIODS = ['one-time', 'month', 'year', 'hour'] as const;
export type PricePeriod = (typeof PRICE_PERIODS)[number];

export const SOCIAL_PLATFORMS = [
  'linkedin',
  'github',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'dribbble',
  'behance',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** Keys of the settings store. `security` and `notifications` are never public. */
export const SETTINGS_KEYS = [
  'site',
  'navigation',
  'seo',
  'features',
  'notifications',
  'security',
] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];

/** Settings the storefront may read through `GET /settings/public`. */
export const PUBLIC_SETTINGS_KEYS = [
  'site',
  'navigation',
  'seo',
  'features',
] as const satisfies readonly SettingsKey[];
export type PublicSettingsKey = (typeof PUBLIC_SETTINGS_KEYS)[number];

// Mirrors of the Prisma enums, in the lower-case wire format the API uses.
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const APPLICATION_STATUSES = ['new', 'reviewing', 'rejected', 'hired'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const SUBSCRIBER_STATUSES = ['pending', 'confirmed', 'unsubscribed'] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

export const STAFF_STATUSES = ['active', 'disabled'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

/** Password policy (doc §9.6): length only, plus a breached-password check on the API. */
export const PASSWORD_LIMITS = { min: 12, max: 128 } as const;

/** Number of single-use recovery codes issued when 2FA is enrolled. */
export const RECOVERY_CODE_COUNT = 10;
