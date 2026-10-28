import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_HEADERS, API_ROUTES, type ProblemDetails } from '@agency/types';

import type * as ApiModule from '@/lib/api';
import { ApiError } from '@/lib/api';

import { submitLead } from './actions';
import { LEAD_MESSAGES, toLeadResult } from './lead-result';

const apiPost = vi.hoisted(() => vi.fn());
const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(requestHeaders.current),
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

const VALID_CONTACT = {
  kind: 'contact',
  name: 'Ada Lovelace',
  email: 'ADA@example.com',
  company: '',
  message: 'Hello there, I would like to talk.',
  consent: true,
  turnstileToken: 'token',
} as const;

const KEY = '01890a5d-ac96-774b-bcce-b302099a8057';

function problem(status: number, errors?: ProblemDetails['errors']): ProblemDetails {
  return {
    type: 'about:blank',
    title: 'Problem',
    status,
    detail: 'secret internals',
    traceId: 't-1',
    ...(errors ? { errors } : {}),
  };
}

beforeEach(() => {
  apiPost.mockReset();
  requestHeaders.current = new Headers({
    'cf-connecting-ip': '203.0.113.7',
    'x-edge-auth': 'test-only-edge-auth-secret-0123456789abcdef',
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('submitLead', () => {
  it('re-validates, forwards the lead with idempotency key and signed client IP', async () => {
    apiPost.mockResolvedValue({ id: 'x', status: 'received' });

    await expect(submitLead(VALID_CONTACT, KEY)).resolves.toEqual({ ok: true });

    expect(apiPost).toHaveBeenCalledTimes(1);
    const [route, body, options] = apiPost.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { headers: Record<string, string> },
    ];
    expect(route).toBe(API_ROUTES.leads);
    expect(body.email).toBe('ada@example.com');
    expect(options.headers[API_HEADERS.idempotencyKey]).toBe(KEY);
    expect(options.headers[API_HEADERS.clientIp]).toBe('203.0.113.7');
    expect(options.headers[API_HEADERS.clientIpSignature]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates an idempotency key when the browser sent an invalid one', async () => {
    apiPost.mockResolvedValue({ id: 'x', status: 'received' });
    requestHeaders.current = new Headers();
    await submitLead(VALID_CONTACT, 'not-a-uuid');
    const options = apiPost.mock.calls[0]![2] as { headers: Record<string, string> };
    expect(options.headers[API_HEADERS.idempotencyKey]).toMatch(/^[0-9a-f-]{36}$/);
    expect(options.headers[API_HEADERS.clientIp]).toBeUndefined();
  });

  it('never calls the API with an invalid payload', async () => {
    const result = await submitLead({ ...VALID_CONTACT, email: 'nope', extra: 1 }, KEY);
    expect(result.ok).toBe(false);
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('maps API failures to safe messages', async () => {
    apiPost.mockRejectedValue(new ApiError('http', 429, problem(429)));
    await expect(submitLead(VALID_CONTACT, KEY)).resolves.toEqual({
      ok: false,
      message: LEAD_MESSAGES.rateLimited,
    });
  });

  it('hides unexpected errors behind a generic message', async () => {
    apiPost.mockRejectedValue(new Error('boom'));
    const result = await submitLead(VALID_CONTACT, KEY);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain('boom');
  });
});

describe('toLeadResult', () => {
  it('maps 400 problem errors to the first message per field', () => {
    expect(
      toLeadResult({
        kind: 'api',
        status: 400,
        problem: problem(400, { email: ['Bad email.', 'Second.'], turnstileToken: ['Retry.'] }),
      }),
    ).toEqual({
      ok: false,
      message: LEAD_MESSAGES.invalid,
      fieldErrors: { email: 'Bad email.', turnstileToken: 'Retry.' },
    });
  });

  it('uses a generic message for other statuses and never leaks problem.detail', () => {
    for (const status of [0, 400, 403, 409, 500, 503]) {
      const result = toLeadResult({ kind: 'api', status, problem: problem(status) });
      expect(result).toEqual({ ok: false, message: LEAD_MESSAGES.generic });
    }
  });

  it('maps schema failures to field errors', async () => {
    const result = await submitLead({ ...VALID_CONTACT, name: '' }, KEY);
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: 'Enter your name.' } });
  });
});
