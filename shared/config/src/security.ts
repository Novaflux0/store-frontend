import {
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from './duration.js';

/**
 * Token and link lifetimes in seconds (doc §9.6, §7.9). Seconds because JWT
 * `exp` and cookie `Max-Age` are expressed in seconds.
 */
export const TOKEN_TTL = {
  /** EdDSA access JWT. */
  accessSeconds: 15 * SECONDS_PER_MINUTE,
  /** Rotating refresh token (default session). */
  refreshSeconds: 7 * SECONDS_PER_DAY,
  /** Rotating refresh token when the user ticks "remember me". */
  refreshRememberMeSeconds: 30 * SECONDS_PER_DAY,
  /** R2 presigned upload / download URLs. */
  signedUrlSeconds: 5 * SECONDS_PER_MINUTE,
} as const;

/** How long an `Idempotency-Key` result is kept, so client retries are safe (plan §A). */
export const IDEMPOTENCY_KEY_TTL_SECONDS = 24 * SECONDS_PER_HOUR;

/** Every API request is aborted after this long (doc §7.4 timeout interceptor). */
export const REQUEST_TIMEOUT_MS = 10 * MS_PER_SECOND;

/** Maximum JSON request body; files never pass through the API (doc §9.8). */
export const JSON_BODY_LIMIT = '100kb';

/** Have I Been Pwned lookup timeout; on timeout the check fails open (ADR 0009). */
export const HIBP_TIMEOUT_MS = 2 * MS_PER_SECOND;

/**
 * Maximum age of a signed `X-Client-IP` header from a Server Action (ADR 0006).
 * Older signatures are rejected, so a captured header cannot be replayed later.
 */
export const CLIENT_IP_SIGNATURE_MAX_AGE_MS = 60 * MS_PER_SECOND;
