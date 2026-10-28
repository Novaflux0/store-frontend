import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_HEADERS, API_ROUTES, type ProblemDetails } from '@agency/types';

import type * as ApiModule from '@/lib/api';
import { ApiError } from '@/lib/api';

import { confirmNewsletter, subscribeNewsletter, unsubscribeNewsletter } from './actions';

const apiPost = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve(
      new Headers({
        'cf-connecting-ip': '203.0.113.7',
        'x-edge-auth': 'test-only-edge-auth-secret-0123456789abcdef',
      }),
    ),
}));
vi.mock('@/lib/env/server', () => ({
  getServerEnv: () => ({
    API_BASE_URL: 'http://api.test',
    CLIENT_IP_HMAC_SECRET: 'test-only-client-ip-secret-0123456789abcdef',
    EDGE_AUTH_SECRET: 'test-only-edge-auth-secret-0123456789abcdef',
  }),
}));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  apiPost,
}));

const KEY = '01890a5d-ac96-774b-bcce-b302099a8057';
const TOKEN = 'a'.repeat(43);

function problem(status: number, slug: string, errors?: ProblemDetails['errors']): ApiError {
  return new ApiError('http', status, {
    type: `https://api.agency.com/errors/${slug}`,
    title: 'Problem',
    status,
    detail: 'internal detail',
    traceId: 't-1',
    ...(errors ? { errors } : {}),
  });
}

interface CallOptions {
  headers: Record<string, string>;
}

beforeEach(() => {
  apiPost.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('subscribeNewsletter', () => {
  it('validates, then posts with an idempotency key and the signed client IP', async () => {
    apiPost.mockResolvedValue({ status: 'pending_confirmation' });
    await expect(
      subscribeNewsletter({ email: ' ADA@example.com ', turnstileToken: 't' }, KEY),
    ).resolves.toEqual({ ok: true });

    const [route, body, options] = apiPost.mock.calls[0] as [string, unknown, CallOptions];
    expect(route).toBe(API_ROUTES.newsletter.subscribe);
    expect(body).toEqual({ email: 'ada@example.com', turnstileToken: 't' });
    expect(options.headers[API_HEADERS.idempotencyKey]).toBe(KEY);
    expect(options.headers[API_HEADERS.clientIp]).toBe('203.0.113.7');
    expect(options.headers[API_HEADERS.clientIpSignature]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('replaces an invalid idempotency key with a fresh one', async () => {
    apiPost.mockResolvedValue({ status: 'pending_confirmation' });
    await subscribeNewsletter({ email: 'ada@example.com', turnstileToken: 't' }, 'nope');
    const [, , options] = apiPost.mock.calls[0] as [string, unknown, CallOptions];
    expect(options.headers[API_HEADERS.idempotencyKey]).toMatch(/^[0-9a-f-]{36}$/);
    expect(options.headers[API_HEADERS.idempotencyKey]).not.toBe('nope');
  });

  it('returns field errors without calling the API for invalid input', async () => {
    const result = await subscribeNewsletter({ email: 'nope', turnstileToken: '' }, KEY);
    expect(result).toEqual({
      ok: false,
      message: 'Please check the highlighted fields and try again.',
      fieldErrors: {
        email: 'Enter a valid email address.',
        turnstileToken: 'Complete the security check.',
      },
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it.each([
    [problem(429, 'rate-limited'), 'Too many requests, try again later.'],
    [problem(503, 'service-unavailable'), /temporarily unavailable/],
    [problem(403, 'verification-failed'), /security check failed/],
    [new ApiError('timeout', 0), /temporarily unavailable/],
    [new Error('boom'), /Something went wrong/],
  ])('maps %o to friendly copy', async (error, message) => {
    apiPost.mockRejectedValue(error);
    const result = await subscribeNewsletter(
      { email: 'ada@example.com', turnstileToken: 't' },
      KEY,
    );
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.message).toMatch(message);
    expect(JSON.stringify(result)).not.toContain('internal detail');
  });
});

describe('confirmNewsletter / unsubscribeNewsletter', () => {
  it('posts the token to the right route, without an idempotency key', async () => {
    apiPost.mockResolvedValue({ status: 'confirmed' });
    await expect(confirmNewsletter(TOKEN)).resolves.toEqual({ ok: true });
    await expect(unsubscribeNewsletter(TOKEN)).resolves.toEqual({ ok: true });

    const calls = apiPost.mock.calls as [string, unknown, CallOptions][];
    const [confirmRoute, confirmBody, confirmOptions] = calls[0]!;
    const [unsubscribeRoute] = calls[1]!;
    expect(confirmRoute).toBe(API_ROUTES.newsletter.confirm);
    expect(unsubscribeRoute).toBe(API_ROUTES.newsletter.unsubscribe);
    expect(confirmBody).toEqual({ token: TOKEN });
    expect(confirmOptions.headers[API_HEADERS.idempotencyKey]).toBeUndefined();
    expect(confirmOptions.headers[API_HEADERS.clientIp]).toBe('203.0.113.7');
  });

  it('rejects a malformed token without calling the API', async () => {
    await expect(confirmNewsletter('short')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: 'This link is invalid or has expired.',
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it.each([
    [problem(400, 'invalid-or-expired-token'), 'invalid'],
    [problem(400, 'validation-error'), 'invalid'],
    [problem(429, 'rate-limited'), 'retry'],
    [problem(503, 'service-unavailable'), 'retry'],
    [new ApiError('network', 0), 'retry'],
  ])('maps %o to reason %s', async (error, reason) => {
    apiPost.mockRejectedValue(error);
    const result = await unsubscribeNewsletter(TOKEN);
    expect(result).toMatchObject({ ok: false, reason });
  });
});
