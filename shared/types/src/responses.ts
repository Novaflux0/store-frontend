// Success response bodies of the R1 public API, each with its HTTP status.
// Timestamps are ISO 8601 strings in UTC, because JSON has no date type.

/** Matches the body produced by @nestjs/terminus health checks. */
export type HealthStatus = 'ok' | 'error' | 'shutting_down';

export interface HealthIndicatorStatus {
  readonly status: 'up' | 'down';
  readonly [detail: string]: unknown;
}

export type HealthIndicatorResults = Readonly<Record<string, HealthIndicatorStatus>>;

/** `GET /health/live` and `GET /health/ready`. */
export interface HealthResponse {
  readonly status: HealthStatus;
  readonly info?: HealthIndicatorResults;
  readonly error?: HealthIndicatorResults;
  readonly details: HealthIndicatorResults;
}

/** `POST /leads` (201 Created): the lead is stored; notification email is queued. */
export interface CreateLeadResponse {
  readonly id: string;
  readonly status: 'received';
}

/**
 * `POST /newsletter/subscribe` (202 Accepted). Identical for new, pending and
 * existing subscribers so the endpoint cannot be used to discover emails
 * (plan I2-6); a confirmation email follows only when one is due.
 */
export interface NewsletterSubscribeResponse {
  readonly status: 'pending_confirmation';
}

/**
 * `POST /newsletter/confirm` (200 OK) for a valid, unexpired confirm token. The
 * token is single-use: an invalid, expired or already used token (including a
 * repeat of a successful confirm) is a 400 problem `invalid-or-expired-token`.
 */
export interface NewsletterConfirmResponse {
  readonly status: 'confirmed';
}

/**
 * `POST /newsletter/unsubscribe` (200 OK) for a valid unsubscribe token.
 * Idempotent: repeating it with the same valid token (already unsubscribed)
 * returns 200 again. An invalid token is a 400 problem `invalid-or-expired-token`.
 */
export interface NewsletterUnsubscribeResponse {
  readonly status: 'unsubscribed';
}

/**
 * `POST /careers/applications` (202 Accepted). The application is stored, but
 * the CV is virus-scanned asynchronously; notifications go out only after a
 * clean scan (plan I2-4, I2-5), so the outcome is not known yet.
 */
export interface JobApplicationResponse {
  /** UUID v7 of the application. */
  readonly id: string;
  readonly status: 'received';
}

/**
 * `POST /files/upload-url` (201 Created): a PENDING file record plus a
 * presigned PUT URL to the quarantine bucket (plan I2-3). The browser uploads
 * straight to storage with `fetch(uploadUrl, { method, headers, body: file })`,
 * sending every header listed here unchanged: the signature covers them
 * (`Content-Type`, `Content-Length`), so a different type or size is refused.
 */
export interface UploadUrlResponse {
  /** UUID v7 of the pending file record; submit it with the owning form (e.g. `cvFileId`). */
  readonly fileId: string;
  readonly uploadUrl: string;
  readonly method: 'PUT';
  readonly headers: Readonly<Record<string, string>>;
  /** ISO 8601 expiry of `uploadUrl` (5 minutes after issue). */
  readonly expiresAt: string;
}

/** Cursor-paginated list. `nextCursor` is `null` on the last page. */
export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}
