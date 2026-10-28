/**
 * `@agency/validation/constants`: every Zod-free value of the contract (option
 * lists, field limits, upload policy). Browser code imports from here so the
 * first JS bundle does not contain Zod; the root entry re-exports all of it next
 * to the schemas.
 *
 * Rule: this module and everything it imports must never import `zod`
 * (enforced by `constants.test.ts`).
 */
export {
  APPLICATION_STATUSES,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  EMPLOYMENT_TYPES,
  FEATURABLE_CONTENT_TYPES,
  LEAD_STATUSES,
  LEGAL_PAGE_SLUGS,
  PAGE_SLUGS,
  PASSWORD_LIMITS,
  PRICE_PERIODS,
  PUBLIC_SETTINGS_KEYS,
  RECOVERY_CODE_COUNT,
  SALARY_UNITS,
  SETTINGS_KEYS,
  SINGLETON_CONTENT_TYPES,
  SOCIAL_PLATFORMS,
  STAFF_STATUSES,
  SUBSCRIBER_STATUSES,
  type ApplicationStatus,
  type ContentStatus,
  type ContentType,
  type EmploymentType,
  type FeaturableContentType,
  type LeadStatus,
  type LegalPageSlug,
  type PageSlug,
  type PricePeriod,
  type PublicSettingsKey,
  type SalaryUnit,
  type SettingsKey,
  type SocialPlatform,
  type StaffStatus,
  type SubscriberStatus,
} from './admin-options.js';
export {
  BUDGET_OPTIONS,
  LEAD_KINDS,
  SERVICE_OPTIONS,
  TIMELINE_OPTIONS,
  type BudgetOption,
  type LeadKind,
  type ServiceOption,
  type TimelineOption,
} from './lead-options.js';
export { FIELD_LIMITS, OPAQUE_TOKEN_LENGTH, PAGINATION } from './limits.js';
export {
  HEADING_FONT_KEYS,
  HEADING_FONT_WEIGHTS,
  HEADING_FONTS,
  HEADING_LEVELS,
  HEADING_STYLE_LIMITS,
  LINK_REL_TOKENS,
  RICH_TEXT_BLOCK_NODES,
  RICH_TEXT_INLINE_NODES,
  RICH_TEXT_MARK_TYPES,
  RICH_TEXT_NODE_TYPES,
  headingStyle,
  linkRelTokens,
  type HeadingFont,
  type HeadingLevel,
  type HeadingStyleAttrs,
  type LinkRelToken,
  type RichTextDoc,
  type RichTextMark,
  type RichTextMarkType,
  type RichTextNode,
  type RichTextNodeType,
} from './rich-text-options.js';
export {
  REDIRECT_MAX_HOPS,
  REDIRECT_PATH_MAX,
  REDIRECT_STATUS_CODES,
  REDIRECT_TARGET_MAX,
  detectRedirectIssues,
  normalizeRedirectPath,
  normalizeRedirectTarget,
  resolveRedirect,
  type RedirectIssue,
  type RedirectRule,
  type RedirectStatusCode,
} from './redirect-rules.js';
export {
  READING_WORDS_PER_MINUTE,
  countWords,
  extractLinks,
  headingOutline,
  inlineText,
  isInternalHref,
  readingTimeMinutes,
  richTextToPlainText,
  slugifyHeading,
  type HeadingOutlineItem,
  type RichTextLink,
} from './rich-text-utils.js';
export {
  ALLOWED_UPLOAD_MIME,
  MIME_TYPES,
  isAllowedUpload,
  type UploadPolicy,
} from './upload-policy.js';

export { UPLOAD_PURPOSES, type UploadPurpose } from '@agency/config';
