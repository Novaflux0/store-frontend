import { z } from 'zod';

import { FIELD_LIMITS, OPAQUE_TOKEN_LENGTH, PAGINATION } from './limits.js';

/** Rejects control characters (newlines, NUL, escape codes) in single-line fields. */
const SINGLE_LINE = /^[^\p{Cc}]*$/u;
// Lowercase words joined by single hyphens. Lookaheads instead of nested
// quantifiers, so the pattern cannot backtrack catastrophically.
const KEBAB_CASE = /^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]+$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
/** Digits, spaces and common separators, optionally starting with "+". Loose on purpose: formats vary by country. */
const PHONE = /^\+?[0-9(][0-9 ().-]{4,}[0-9]$/;

/**
 * Email: trimmed and lowercased before the format check, so `" Foo@Example.com "`
 * is stored as `foo@example.com` (the database column is `citext` as well).
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(FIELD_LIMITS.emailMax, `Email must be at most ${FIELD_LIMITS.emailMax} characters.`)
  .pipe(z.email('Enter a valid email address.'));

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name.')
  .max(FIELD_LIMITS.nameMax, `Name must be at most ${FIELD_LIMITS.nameMax} characters.`)
  .regex(SINGLE_LINE, 'Name must be a single line.');

/** Cloudflare Turnstile response token; the API verifies it with siteverify. */
export const turnstileTokenSchema = z
  .string()
  .trim()
  .min(1, 'Complete the security check.')
  .max(FIELD_LIMITS.turnstileTokenMax, 'Security check token is invalid.');

/**
 * Honeypot field (`extraNote`) on public forms: hidden from people, so only bots fill
 * it (a non-semantic name, so autofill and password managers leave it alone). The
 * API rejects and reports a filled one (bot defense, ADR 0018) instead of answering
 * with a validation error.
 */
export const honeypotSchema = z.string().max(FIELD_LIMITS.honeypotMax).optional();

/** All primary keys are UUID v7 (time-ordered). */
export const uuidV7Schema = z.uuid({ version: 'v7', error: 'Must be a valid UUID v7.' });

/** Random single-use token from an email link (newsletter confirm / unsubscribe, invitations). */
export const opaqueTokenSchema = z
  .string()
  .trim()
  .length(OPAQUE_TOKEN_LENGTH, 'This link is invalid or has expired.')
  .regex(BASE64URL, 'This link is invalid or has expired.');

/** URL-safe slug such as `senior-frontend-engineer`. */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(FIELD_LIMITS.slugMax)
  .regex(KEBAB_CASE, 'Must be lowercase words separated by hyphens.');

/** Public `https://` URL with a real domain (no `http:`, `javascript:`, IPs or localhost). */
export const httpsUrlSchema = z
  .string()
  .trim()
  .max(FIELD_LIMITS.urlMax, `URL must be at most ${FIELD_LIMITS.urlMax} characters.`)
  .pipe(
    z.url({
      protocol: /^https$/,
      hostname: z.regexes.domain,
      error: 'Enter a full https:// link.',
    }),
  );

export const phoneSchema = z
  .string()
  .trim()
  .max(FIELD_LIMITS.phoneMax, `Phone number must be at most ${FIELD_LIMITS.phoneMax} characters.`)
  .regex(PHONE, 'Enter a valid phone number.');

/** Explicit opt-in checkbox; only `true` is accepted. */
export const consentSchema = z.literal(true, 'You must agree before submitting.');

/**
 * Optional form field that may arrive as an empty string. HTML forms submit
 * `""` for untouched inputs, so `""` means "not provided" and the API stores it
 * as null. Done with a union rather than a transform so the schema stays
 * representable as JSON Schema / OpenAPI.
 */
export function optionalField<T extends z.ZodType<string>>(schema: T) {
  return z.union([schema, z.literal('')]).optional();
}

/** `?limit=20&cursor=...` on list endpoints. Query strings are coerced to numbers. */
export const cursorQuerySchema = z.strictObject({
  limit: z.coerce
    .number()
    .int()
    .min(PAGINATION.minLimit)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  cursor: z.string().trim().min(1).max(FIELD_LIMITS.cursorMax).optional(),
});

export type CursorQuery = z.infer<typeof cursorQuerySchema>;
