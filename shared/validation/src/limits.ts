/**
 * Field length limits shared by schemas and UI (`maxLength` attributes,
 * character counters). Values mirror the database column sizes.
 */
export const FIELD_LIMITS = {
  /** RFC 5321 maximum length of a forward path. */
  emailMax: 254,
  nameMax: 100,
  companyMax: 200,
  messageMin: 10,
  messageMax: 5000,
  coverLetterMax: 5000,
  phoneMax: 32,
  urlMax: 2048,
  slugMax: 100,
  /** Common filesystem limit; R2 keys are generated server-side, not from this name. */
  fileNameMax: 255,
  /** RFC 6838: type and subtype are at most 127 characters each. */
  mimeTypeMax: 255,
  /** Cloudflare documents Turnstile tokens as at most 2048 characters. */
  turnstileTokenMax: 2048,
  /** Honeypot field: people leave it empty; longer junk is a plain validation error. */
  honeypotMax: 200,
  cursorMax: 512,
} as const;

/** Cursor pagination bounds (doc §7.6). */
export const PAGINATION = {
  minLimit: 1,
  maxLimit: 100,
  defaultLimit: 20,
} as const;

/** 32 random bytes encoded as unpadded base64url = 43 characters. */
export const OPAQUE_TOKEN_LENGTH = 43;
