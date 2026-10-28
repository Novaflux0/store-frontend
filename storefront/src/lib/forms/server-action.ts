import 'server-only';

import { headers } from 'next/headers';

import { API_HEADERS, PROBLEM_TYPES } from '@agency/types';

import { ApiError, problemSlug } from '@/lib/api';
import { getServerEnv } from '@/lib/env/server';
import { clientIpHeaders, getClientIp } from '@/lib/security/client-ip';

import { ACTION_MESSAGES, firstMessages, type ActionFailure } from './action-result';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ApiHeaderOptions {
  /**
   * Adds `Idempotency-Key`. Pass the key the browser generated (reused while the same
   * payload is retried); anything that is not a UUID is replaced by a fresh one.
   */
  readonly idempotencyKey?: unknown;
}

/**
 * Headers every public form call sends to the API: the signed visitor IP (ADR 0006)
 * and, when asked for, an `Idempotency-Key`.
 */
export async function apiRequestHeaders(
  options: ApiHeaderOptions = {},
): Promise<Record<string, string>> {
  const requestHeaders = await headers();
  const { CLIENT_IP_HMAC_SECRET, EDGE_AUTH_SECRET } = getServerEnv();
  const result: Record<string, string> = clientIpHeaders(
    getClientIp(requestHeaders, EDGE_AUTH_SECRET),
    CLIENT_IP_HMAC_SECRET,
  );
  if ('idempotencyKey' in options) {
    const key = options.idempotencyKey;
    result[API_HEADERS.idempotencyKey] =
      typeof key === 'string' && UUID.test(key) ? key : crypto.randomUUID();
  }
  return result;
}

/** Logs what support needs (status, problem slug, trace id), never the request body. */
export function logActionError(action: string, error: unknown): void {
  if (error instanceof ApiError) {
    console.error(`[${action}] API call failed`, {
      kind: error.kind,
      status: error.status,
      problem: problemSlug(error),
      traceId: error.problem?.traceId,
    });
    return;
  }
  console.error(`[${action}] unexpected error`, error);
}

/**
 * Maps the generic API failures every form shares to user-facing copy: 400 field
 * errors, 403 Turnstile, 429 and 503. Feature-specific slugs are handled by the caller
 * before falling back to this.
 */
export function describeApiFailure(
  error: unknown,
  rename: Readonly<Record<string, string>> = {},
): ActionFailure {
  if (!(error instanceof ApiError)) return { ok: false, message: ACTION_MESSAGES.generic };
  if (error.kind === 'network' || error.kind === 'timeout') {
    return { ok: false, message: ACTION_MESSAGES.unavailable };
  }
  const errors = error.problem?.errors;
  switch (error.status) {
    case 400:
      return errors
        ? {
            ok: false,
            message: ACTION_MESSAGES.invalid,
            fieldErrors: firstMessages(errors, rename),
          }
        : { ok: false, message: ACTION_MESSAGES.generic };
    case 403:
      // A temporary bot-defense ban reads like a rate limit: no hint about why.
      if (problemSlug(error) === PROBLEM_TYPES.addressBlocked) {
        return { ok: false, message: ACTION_MESSAGES.rateLimited };
      }
      return problemSlug(error) === PROBLEM_TYPES.verificationFailed
        ? {
            ok: false,
            message: ACTION_MESSAGES.verificationFailed,
            fieldErrors: { turnstileToken: ACTION_MESSAGES.verificationFailed },
          }
        : { ok: false, message: ACTION_MESSAGES.generic };
    case 429:
      return { ok: false, message: ACTION_MESSAGES.rateLimited };
    case 503:
      return { ok: false, message: ACTION_MESSAGES.unavailable };
    default:
      return { ok: false, message: ACTION_MESSAGES.generic };
  }
}
