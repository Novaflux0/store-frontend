import { describe, expect, it } from 'vitest';

import {
  REVALIDATE_MAX_AGE_MS,
  ReplayGuard,
  checkRevalidation,
  signRevalidation,
} from './revalidate';

const SECRET = 'r'.repeat(32);
const NOW = 1_800_000_000_000;

function request(body: string, overrides: { timestamp?: string; signature?: string | null } = {}) {
  const timestamp = overrides.timestamp ?? String(NOW);
  return {
    secrets: [SECRET],
    timestamp,
    signature:
      overrides.signature === undefined
        ? signRevalidation(SECRET, timestamp, body)
        : overrides.signature,
    body,
    nowMs: NOW,
    replay: new ReplayGuard(),
  };
}

const BODY = JSON.stringify({
  tags: ['content:blog-post', 'content:blog-post:hello-world', 'settings'],
});

describe('checkRevalidation', () => {
  it('accepts a fresh, correctly signed request and returns its tags', () => {
    expect(checkRevalidation(request(BODY))).toEqual({
      ok: true,
      tags: ['content:blog-post', 'content:blog-post:hello-world', 'settings'],
    });
  });

  it('matches the signature the API computes', () => {
    // HMAC-SHA256("r" x 32, `${timestamp}.${body}`), computed independently.
    expect(signRevalidation(SECRET, '1800000000000', '{"tags":["settings"]}')).toBe(
      'cca043a2d2db00e25b0f7a7f6564b3a6b9e1a714a0c994c56bfe5eb09d010cb6',
    );
  });

  it('refuses missing, malformed and wrong signatures', () => {
    expect(checkRevalidation(request(BODY, { signature: null }))).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(checkRevalidation(request(BODY, { signature: 'xyz' }))).toMatchObject({
      reason: 'malformed signature',
    });
    expect(
      checkRevalidation(
        request(BODY, { signature: signRevalidation('s'.repeat(32), String(NOW), BODY) }),
      ),
    ).toMatchObject({ reason: 'bad signature' });
    expect(checkRevalidation({ ...request(BODY), secrets: [] })).toMatchObject({
      reason: 'not configured',
    });
  });

  it('refuses signatures older or newer than five minutes', () => {
    const old = String(NOW - REVALIDATE_MAX_AGE_MS - 1);
    expect(checkRevalidation(request(BODY, { timestamp: old }))).toMatchObject({
      reason: 'stale signature',
    });
    const future = String(NOW + REVALIDATE_MAX_AGE_MS + 1);
    expect(checkRevalidation(request(BODY, { timestamp: future }))).toMatchObject({
      reason: 'stale signature',
    });
  });

  it('refuses a replay of the same signed request', () => {
    const first = request(BODY);
    expect(checkRevalidation(first).ok).toBe(true);
    expect(checkRevalidation(first)).toMatchObject({ ok: false, reason: 'replayed' });
  });

  it.each([
    'not json',
    '{}',
    JSON.stringify({ tags: [] }),
    JSON.stringify({ tags: ['../etc'] }),
    JSON.stringify({ tags: ['content:Blog'] }),
    JSON.stringify({ tags: [42] }),
    JSON.stringify({ tags: Array.from({ length: 101 }, () => 'settings') }),
  ])('refuses the body %j with 400', (body) => {
    expect(checkRevalidation(request(body))).toMatchObject({ ok: false, status: 400 });
  });
});

describe('ReplayGuard', () => {
  it('forgets signatures after they expire and evicts the oldest when full', () => {
    const guard = new ReplayGuard(2);
    expect(guard.accept('a', 0)).toBe(true);
    expect(guard.accept('a', 1)).toBe(false);
    expect(guard.accept('a', 3 * REVALIDATE_MAX_AGE_MS)).toBe(true);
    expect(guard.accept('b', 3 * REVALIDATE_MAX_AGE_MS)).toBe(true);
    expect(guard.accept('c', 3 * REVALIDATE_MAX_AGE_MS)).toBe(true);
    // "a" was evicted to make room, so it is accepted again.
    expect(guard.accept('a', 3 * REVALIDATE_MAX_AGE_MS)).toBe(true);
  });
});
