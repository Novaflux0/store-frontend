/**
 * Problem type slugs used by the API: the last segment of `ProblemDetails.type`
 * (the API's `PROBLEM_TYPE_BASE_URL` followed by the slug). Clients branch on
 * the slug, never on `title` or `detail`, which are human text and may change.
 * The usual HTTP status is noted on each entry.
 */
export const PROBLEM_TYPES = {
  // Generic HTTP problems (also produced from plain Nest HttpExceptions,
  // whose slug is the kebab-case status text).
  /** 400: malformed request, e.g. a body that is not valid JSON. */
  badRequest: 'bad-request',
  /** 400: the body or query failed its Zod schema; `errors` lists the fields. */
  validationError: 'validation-error',
  /** 401: missing or invalid credentials. */
  unauthorized: 'unauthorized',
  /** 403: signed in but not allowed. */
  forbidden: 'forbidden',
  /** 404: unknown route or resource. */
  notFound: 'not-found',
  /** 405: method not allowed on this route. */
  methodNotAllowed: 'method-not-allowed',
  /** 409: the request conflicts with the current state of the resource. */
  conflict: 'conflict',
  /** 413: request body larger than the JSON body limit. */
  payloadTooLarge: 'payload-too-large',
  /** 415: request body is not JSON or uses an unsupported encoding/charset. */
  unsupportedMediaType: 'unsupported-media-type',
  /** 429: rate limit hit; honour `Retry-After`. */
  rateLimited: 'rate-limited',
  /** 500: unexpected error; details are only in the logs (by `traceId`). */
  internalError: 'internal-error',
  /** 503: a dependency (database, Valkey, storage, ...) is down; honour `Retry-After`. */
  serviceUnavailable: 'service-unavailable',
  /** 503: the request exceeded the server-side timeout; honour `Retry-After`. */
  timeout: 'timeout',

  // Security checks.
  /** 403: the Cloudflare Turnstile token did not verify. */
  verificationFailed: 'verification-failed',
  /** 403: bot defense banned the client address for a while; honour `Retry-After`. */
  addressBlocked: 'address-blocked',

  // Idempotency-Key handling.
  /** 400: the `Idempotency-Key` header has an invalid format. */
  invalidIdempotencyKey: 'invalid-idempotency-key',
  /** 409: a request with the same key is still in progress; retry shortly. */
  idempotencyKeyInUse: 'idempotency-key-in-use',
  /** 422: the key was already used with a different request body. */
  idempotencyKeyReused: 'idempotency-key-reused',
  /** 409: generic idempotency conflict (any key clash not covered above). */
  idempotencyConflict: 'idempotency-conflict',

  // Feature-specific problems.
  /**
   * 400: a newsletter confirm/unsubscribe (or other email-link) token is
   * malformed, unknown, already used or expired. One slug for all cases, so a
   * token cannot be probed.
   */
  invalidOrExpiredToken: 'invalid-or-expired-token',
  /**
   * 422: the referenced upload (e.g. `cvFileId`) does not exist, has the wrong
   * purpose, was never uploaded, is too old or does not match the declared size.
   */
  uploadNotFound: 'upload-not-found',
  /** 409: the referenced upload is already attached to another submission. */
  uploadAlreadyUsed: 'upload-already-used',

  // Staff authentication and the admin dashboard.
  /** 401: email, password or second factor is wrong. One slug for all, so accounts cannot be probed. */
  invalidCredentials: 'invalid-credentials',
  /** 423: too many failed sign-ins; honour `Retry-After`. */
  accountLocked: 'account-locked',
  /** 403: the action needs a fresh re-authentication (`POST /auth/step-up`). */
  stepUpRequired: 'step-up-required',
  /** 403: the Cloudflare Access JWT is missing or invalid. */
  accessDenied: 'access-denied',
  /** 422: the password appears in known data breaches (HIBP). */
  // guardian-ignore SEC004: a problem slug, not a secret
  breachedPassword: 'breached-password',
  /** 409: someone saved a newer version; reload and reapply the change. */
  versionConflict: 'version-conflict',
  /** 409: the slug is already used by another entry of the same type. */
  slugTaken: 'slug-taken',
  /** 409: the action would leave no active Super Admin. */
  lastSuperAdmin: 'last-super-admin',
  /** 409: the media asset is still used by content and cannot be deleted. */
  mediaInUse: 'media-in-use',
  /** 503: this form or feature is switched off in the site settings. */
  featureDisabled: 'feature-disabled',
} as const;

/** Union of every problem slug in `PROBLEM_TYPES`. */
export type ProblemType = (typeof PROBLEM_TYPES)[keyof typeof PROBLEM_TYPES];
