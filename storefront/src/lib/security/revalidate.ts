import { createHmac, timingSafeEqual } from 'node:crypto';

import type { RevalidateRequest } from '@agency/types';

/**
 * Verification of the API's on-demand revalidation requests (ADR 0014). Canonical
 * signature, computed identically by the API (backend revalidation client):
 *   signature = lowercase hex( HMAC-SHA256( REVALIDATE_HMAC_SECRET, `${timestamp}.${body}` ) )
 * with `timestamp` in Unix milliseconds and `body` the raw JSON `{ "tags": [...] }`.
 */

/** Signatures older (or further in the future) than this are refused. */
export const REVALIDATE_MAX_AGE_MS = 5 * 60_000;
/** A request lists at most 100 short tags; anything bigger is not from the API. */
export const REVALIDATE_MAX_BODY_BYTES = 16 * 1024;

const TIMESTAMP = /^\d{1,15}$/;
const SIGNATURE = /^[0-9a-f]{64}$/;
/** Lowercase words joined by single hyphens (content types and slugs). */
const KEBAB = /^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]+$/;
const MAX_TAG_LENGTH = 256;
const MAX_TAGS = 100;

export function signRevalidation(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
}

export type RevalidationCheck =
  | { readonly ok: true; readonly tags: readonly string[] }
  | { readonly ok: false; readonly status: 400 | 401; readonly reason: string };

/**
 * Remembers recently accepted signatures until they expire, so a captured request
 * cannot be replayed inside the five-minute window. In memory, per server instance:
 * a replay that reaches another instance only repeats an idempotent revalidation.
 */
export class ReplayGuard {
  private readonly seen = new Map<string, number>();

  constructor(private readonly capacity = 1000) {}

  /** Records the signature; false when it was already used and is still fresh. */
  accept(signature: string, nowMs: number): boolean {
    for (const [key, expiresAt] of this.seen) {
      if (expiresAt <= nowMs) this.seen.delete(key);
    }
    const expiresAt = this.seen.get(signature);
    if (expiresAt !== undefined && expiresAt > nowMs) return false;
    // Oldest entries go first once the guard is full (Map keeps insertion order).
    while (this.seen.size >= this.capacity) {
      const oldest = this.seen.keys().next().value;
      if (oldest === undefined) break;
      this.seen.delete(oldest);
    }
    this.seen.set(signature, nowMs + 2 * REVALIDATE_MAX_AGE_MS);
    return true;
  }
}

/** The `CACHE_TAGS` shapes: `settings`, `content:<type>`, `content:<type>:<slug>`. */
export function isCacheTag(tag: string): boolean {
  if (tag === 'settings') return true;
  const [scope, ...rest] = tag.split(':');
  return (
    scope === 'content' &&
    rest.length >= 1 &&
    rest.length <= 2 &&
    rest.every((part) => KEBAB.test(part))
  );
}

function parseTags(body: string): readonly string[] | null {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  const tags = (data as Partial<RevalidateRequest> | null)?.tags;
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS) return null;
  const valid = tags.filter(
    (tag): tag is string =>
      typeof tag === 'string' && tag.length <= MAX_TAG_LENGTH && isCacheTag(tag),
  );
  return valid.length === tags.length ? [...new Set(valid)] : null;
}

/** Checks signature, age, replay and body; returns the tags to revalidate. */
export function checkRevalidation(input: {
  readonly secrets: readonly string[];
  readonly timestamp: string | null;
  readonly signature: string | null;
  readonly body: string;
  readonly nowMs: number;
  readonly replay: ReplayGuard;
}): RevalidationCheck {
  const { secrets, timestamp, signature, body, nowMs, replay } = input;
  if (secrets.length === 0) return { ok: false, status: 401, reason: 'not configured' };
  if (timestamp === null || signature === null) {
    return { ok: false, status: 401, reason: 'missing signature' };
  }
  if (!TIMESTAMP.test(timestamp) || !SIGNATURE.test(signature)) {
    return { ok: false, status: 401, reason: 'malformed signature' };
  }
  if (Math.abs(nowMs - Number(timestamp)) > REVALIDATE_MAX_AGE_MS) {
    return { ok: false, status: 401, reason: 'stale signature' };
  }
  const given = Buffer.from(signature, 'hex');
  const valid = secrets.some((secret) =>
    timingSafeEqual(given, Buffer.from(signRevalidation(secret, timestamp, body), 'hex')),
  );
  if (!valid) return { ok: false, status: 401, reason: 'bad signature' };
  const tags = parseTags(body);
  if (tags === null) return { ok: false, status: 400, reason: 'invalid tags' };
  if (!replay.accept(signature, nowMs)) return { ok: false, status: 401, reason: 'replayed' };
  return { ok: true, tags };
}
