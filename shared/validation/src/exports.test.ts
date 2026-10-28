import { describe, expect, it } from 'vitest';

import * as constants from './constants.js';
import * as root from './index.js';

describe('package entry points', () => {
  it('re-exports every /constants value from the root, as the same reference', () => {
    const names = Object.keys(constants);
    expect(names.sort()).toEqual(
      [
        'ALLOWED_UPLOAD_MIME',
        'APPLICATION_STATUSES',
        'BUDGET_OPTIONS',
        'CONTENT_STATUSES',
        'CONTENT_TYPES',
        'EMPLOYMENT_TYPES',
        'FEATURABLE_CONTENT_TYPES',
        'FIELD_LIMITS',
        'HEADING_FONTS',
        'HEADING_FONT_KEYS',
        'HEADING_FONT_WEIGHTS',
        'HEADING_LEVELS',
        'HEADING_STYLE_LIMITS',
        'LINK_REL_TOKENS',
        'READING_WORDS_PER_MINUTE',
        'REDIRECT_MAX_HOPS',
        'REDIRECT_PATH_MAX',
        'REDIRECT_STATUS_CODES',
        'REDIRECT_TARGET_MAX',
        'RICH_TEXT_BLOCK_NODES',
        'RICH_TEXT_INLINE_NODES',
        'RICH_TEXT_MARK_TYPES',
        'RICH_TEXT_NODE_TYPES',
        'LEAD_KINDS',
        'LEAD_STATUSES',
        'LEGAL_PAGE_SLUGS',
        'PAGE_SLUGS',
        'PASSWORD_LIMITS',
        'PRICE_PERIODS',
        'PUBLIC_SETTINGS_KEYS',
        'RECOVERY_CODE_COUNT',
        'SALARY_UNITS',
        'SETTINGS_KEYS',
        'SINGLETON_CONTENT_TYPES',
        'SOCIAL_PLATFORMS',
        'STAFF_STATUSES',
        'SUBSCRIBER_STATUSES',
        'MIME_TYPES',
        'OPAQUE_TOKEN_LENGTH',
        'PAGINATION',
        'SERVICE_OPTIONS',
        'TIMELINE_OPTIONS',
        'UPLOAD_PURPOSES',
        'countWords',
        'detectRedirectIssues',
        'extractLinks',
        'headingOutline',
        'headingStyle',
        'inlineText',
        'isAllowedUpload',
        'isInternalHref',
        'linkRelTokens',
        'normalizeRedirectPath',
        'normalizeRedirectTarget',
        'readingTimeMinutes',
        'resolveRedirect',
        'richTextToPlainText',
        'slugifyHeading',
      ].sort(),
    );
    for (const name of names) {
      expect(root[name as keyof typeof root], name).toBe(constants[name as keyof typeof constants]);
    }
  });

  it('exports the Phase 1 schemas from the root', () => {
    expect(root.publicUploadRequestSchema).toBeDefined();
    expect(root.newsletterConfirmSchema).toBeDefined();
    expect(root.newsletterUnsubscribeSchema).toBeDefined();
  });

  it('exports the admin and CMS schemas from the root', () => {
    expect(root.loginSchema).toBeDefined();
    expect(root.richTextDocSchema).toBeDefined();
    expect(root.contentDataSchema).toBeDefined();
    expect(root.SETTINGS_SCHEMAS).toBeDefined();
    expect(root.mediaUploadRequestSchema).toBeDefined();
    expect(root.leadsQuerySchema).toBeDefined();
  });
});
