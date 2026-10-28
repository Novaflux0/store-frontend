import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ROUTES, PROBLEM_JSON_CONTENT_TYPE, type ProblemDetails } from '@agency/types';
import type { CreateLeadInput } from '@agency/validation';

import { ApiError, apiGet, apiPost, isProblemDetails } from './api';

vi.mock('./env/server', () => ({
  getServerEnv: () => ({
    API_BASE_URL: 'http://api.test',
    CLIENT_IP_HMAC_SECRET: 'x'.repeat(32),
  }),
}));

const LEAD: CreateLeadInput = {
  kind: 'contact',
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Hello there, friends.',
  consent: true,
  turnstileToken: 't',
};

const PROBLEM: ProblemDetails = {
  type: 'https://agency.com/problems/validation-error',
  title: 'Validation failed',
  status: 400,
  detail: 'internal detail that must not reach users',
  traceId: 'trace-123',
  errors: { email: ['Enter a valid email address.'] },
};

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  return input instanceof Request ? input.url : input.toString();
}

function jsonResponse(body: unknown, status: number, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('apiPost', () => {
  it('posts JSON to the versioned route on API_BASE_URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: '1', status: 'received' }, 201));

    const result = await apiPost(API_ROUTES.leads, LEAD, { headers: { 'X-Test': 'yes' } });

    expect(result).toEqual({ id: '1', status: 'received' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(requestUrl(url)).toBe('http://api.test/api/v1/leads');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify(LEAD));
    expect(init?.cache).toBe('no-store');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Test': 'yes',
    });
  });

  it('parses application/problem+json into ApiError.problem', async () => {
    fetchMock.mockResolvedValue(jsonResponse(PROBLEM, 400, PROBLEM_JSON_CONTENT_TYPE));

    const error = await apiPost(API_ROUTES.leads, LEAD).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.kind).toBe('http');
    expect(apiError.status).toBe(400);
    expect(apiError.problem).toEqual(PROBLEM);
    expect(apiError.message).toContain('trace-123');
  });

  it('ignores error bodies that are not Problem Details', async () => {
    fetchMock.mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }));
    const error = (await apiPost(API_ROUTES.leads, LEAD).catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.problem).toBeNull();
  });

  it('ignores malformed problem bodies', async () => {
    fetchMock.mockResolvedValue(
      new Response('{not json', {
        status: 500,
        headers: { 'content-type': PROBLEM_JSON_CONTENT_TYPE },
      }),
    );
    const error = (await apiPost(API_ROUTES.leads, LEAD).catch((e: unknown) => e)) as ApiError;
    expect(error.problem).toBeNull();
  });

  it('reports timeouts and network failures without a status', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
    const timeout = (await apiPost(API_ROUTES.leads, LEAD).catch((e: unknown) => e)) as ApiError;
    expect(timeout.kind).toBe('timeout');
    expect(timeout.status).toBe(0);

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const network = (await apiPost(API_ROUTES.leads, LEAD).catch((e: unknown) => e)) as ApiError;
    expect(network.kind).toBe('network');
  });

  it('flags a success response with an invalid JSON body', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 200 }));
    const error = (await apiPost(API_ROUTES.leads, LEAD).catch((e: unknown) => e)) as ApiError;
    expect(error.kind).toBe('invalid-response');
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      apiPost(API_ROUTES.newsletter.unsubscribe, { token: 'x'.repeat(43) }),
    ).resolves.toBeUndefined();
  });
});

describe('apiGet', () => {
  it('sends no body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok', details: {} }, 200));
    await apiGet(API_ROUTES.health.live);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(requestUrl(url)).toBe('http://api.test/api/v1/health/live');
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeNull();
    expect(init?.headers).not.toHaveProperty('Content-Type');
  });
});

describe('isProblemDetails', () => {
  it('validates the RFC 9457 shape', () => {
    expect(isProblemDetails(PROBLEM)).toBe(true);
    expect(isProblemDetails({ ...PROBLEM, errors: { email: [1] } })).toBe(false);
    expect(isProblemDetails({ ...PROBLEM, traceId: undefined })).toBe(false);
    expect(isProblemDetails(null)).toBe(false);
    expect(isProblemDetails([])).toBe(false);
  });
});
