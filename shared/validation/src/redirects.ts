import { z } from 'zod';

import { cursorQuerySchema } from './common.js';
import {
  normalizeRedirectPath,
  normalizeRedirectTarget,
  REDIRECT_PATH_MAX,
  REDIRECT_STATUS_CODES,
  REDIRECT_TARGET_MAX,
} from './redirect-rules.js';

/** A path the proxy can redirect, normalised (`/Old-Page/` -> `/old-page`). */
export const redirectSourceSchema = z
  .string()
  .max(REDIRECT_PATH_MAX)
  .transform((value, ctx) => {
    const path = normalizeRedirectPath(value);
    if (path === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use a site path such as /old-page (not the home page, /api, /_next or a file).',
      });
      return z.NEVER;
    }
    return path;
  });

const redirectTargetSchema = z
  .string()
  .max(REDIRECT_TARGET_MAX)
  .transform((value, ctx) => {
    const target = normalizeRedirectTarget(value);
    if (target === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use a site path such as /new-page or an https:// link.',
      });
      return z.NEVER;
    }
    return target;
  });

const statusCodeSchema = z.union(
  REDIRECT_STATUS_CODES.map((code) => z.literal(code)),
  {
    error: 'Choose 301, 302 or 410.',
  },
);

/** `POST /admin/seo/redirects` and `PATCH .../:id`. 410 (gone) takes no target. */
export const redirectInputSchema = z
  .strictObject({
    source: redirectSourceSchema,
    target: redirectTargetSchema.nullable().optional(),
    statusCode: statusCodeSchema,
    note: z.string().trim().max(200).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.statusCode === 410) {
      if (input.target !== undefined && input.target !== null) {
        ctx.addIssue({ code: 'custom', path: ['target'], message: 'A 410 (gone) has no target.' });
      }
      return;
    }
    if (input.target === undefined || input.target === null) {
      ctx.addIssue({ code: 'custom', path: ['target'], message: 'Enter where the page moved to.' });
    } else if (normalizeRedirectPath(input.target.split(/[?#]/, 1)[0] ?? '') === input.source) {
      ctx.addIssue({
        code: 'custom',
        path: ['target'],
        message: 'A page cannot redirect to itself.',
      });
    }
  });
export type RedirectInput = z.infer<typeof redirectInputSchema>;

/** `GET /admin/seo/redirects?q=`: search by source or target. */
export const redirectListQuerySchema = cursorQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});

export const NOT_FOUND_STATUSES = ['open', 'ignored', 'resolved'] as const;
export type NotFoundStatus = (typeof NOT_FOUND_STATUSES)[number];

/** `GET /admin/seo/not-found?status=`. */
export const notFoundListQuerySchema = cursorQuerySchema.extend({
  status: z.enum(NOT_FOUND_STATUSES).default('open'),
});

/** `PATCH /admin/seo/not-found/:id`. */
export const notFoundUpdateSchema = z.strictObject({ status: z.enum(NOT_FOUND_STATUSES) });

export const LINK_CHECK_RESULTS = ['ok', 'broken', 'redirected', 'timeout', 'blocked'] as const;
export type LinkCheckResultValue = (typeof LINK_CHECK_RESULTS)[number];

/** `GET /admin/seo/links?result=`: problems by default. */
export const linkCheckListQuerySchema = cursorQuerySchema.extend({
  result: z.enum(LINK_CHECK_RESULTS).optional(),
});

/**
 * `POST /internal/seo-events` (signed by the storefront): a 404 it served, or a
 * redirect it applied. Paths are normalised by the API; invalid ones are ignored.
 */
export const seoEventSchema = z.strictObject({
  kind: z.enum(['not-found', 'redirect-hit']),
  path: z.string().min(1).max(REDIRECT_TARGET_MAX),
  referrer: z.string().max(REDIRECT_TARGET_MAX).optional(),
});
export type SeoEvent = z.infer<typeof seoEventSchema>;
