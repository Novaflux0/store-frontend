import { afterEach, describe, expect, it, vi } from 'vitest';

import { API_HEADERS } from '@agency/types';

import { ApiError, problemSlug } from '@/lib/api';

import { ACTION_MESSAGES, firstMessages } from './action-result';
import { focusFirstInvalid } from './focus-first-invalid';
import { apiRequestHeaders, describeApiFailure, logActionError } from './server-action';

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock('next/headers', () => ({ headers: () => Promise.resolve(requestHeaders.current) }));
vi.mock('@/lib/env/server', () => ({
  getServerEnv: () => ({
    CLIENT_IP_HMAC_SECRET: 'test-only-client-ip-secret-0123456789abcdef',
    EDGE_AUTH_SECRET: 'test-only-edge-auth-secret-0123456789abcdef',
  }),
}));

function apiError(status: number, type?: string, errors?: Record<string, string[]>) {
  return new ApiError(
    'http',
    status,
    type
      ? {
          type,
          title: 'T',
          status,
          detail: 'secret',
          traceId: 'trace',
          ...(errors ? { errors } : {}),
        }
      : null,
  );
}

describe('firstMessages', () => {
  it('keeps the first message per field and renames contract fields', () => {
    expect(
      firstMessages(
        { fileName: ['Bad name.'], sizeBytes: ['Too big.'], email: ['Bad.', 'Worse.'], x: [] },
        { fileName: 'cv', sizeBytes: 'cv' },
      ),
    ).toEqual({ cv: 'Bad name.', email: 'Bad.' });
  });
});

describe('problemSlug', () => {
  it('reads the last segment of the problem type', () => {
    expect(problemSlug(apiError(422, 'https://api.agency.com/errors/upload-not-found'))).toBe(
      'upload-not-found',
    );
    expect(problemSlug(apiError(400, 'about:blank#validation-error'))).toBe('validation-error');
    expect(problemSlug(apiError(500))).toBeNull();
  });
});

describe('describeApiFailure', () => {
  it('maps validation problems to field errors', () => {
    expect(
      describeApiFailure(apiError(400, '/errors/validation-error', { cvFileId: ['Unknown.'] }), {
        cvFileId: 'cv',
      }),
    ).toEqual({ ok: false, message: ACTION_MESSAGES.invalid, fieldErrors: { cv: 'Unknown.' } });
    expect(describeApiFailure(apiError(400, '/errors/bad-request'))).toEqual({
      ok: false,
      message: ACTION_MESSAGES.generic,
    });
  });

  it('maps Turnstile, rate limit, outage and unknown failures', () => {
    expect(describeApiFailure(apiError(403, '/errors/verification-failed'))).toMatchObject({
      message: ACTION_MESSAGES.verificationFailed,
      fieldErrors: { turnstileToken: ACTION_MESSAGES.verificationFailed },
    });
    expect(describeApiFailure(apiError(403, '/errors/forbidden')).message).toBe(
      ACTION_MESSAGES.generic,
    );
    expect(describeApiFailure(apiError(403, '/errors/address-blocked'))).toEqual({
      ok: false,
      message: ACTION_MESSAGES.rateLimited,
    });
    expect(describeApiFailure(apiError(429, '/errors/rate-limited')).message).toBe(
      ACTION_MESSAGES.rateLimited,
    );
    expect(describeApiFailure(apiError(503, '/errors/service-unavailable')).message).toBe(
      ACTION_MESSAGES.unavailable,
    );
    expect(describeApiFailure(new ApiError('network', 0)).message).toBe(
      ACTION_MESSAGES.unavailable,
    );
    expect(describeApiFailure(apiError(500, '/errors/internal-error')).message).toBe(
      ACTION_MESSAGES.generic,
    );
    expect(describeApiFailure(new TypeError('boom')).message).toBe(ACTION_MESSAGES.generic);
  });
});

describe('apiRequestHeaders', () => {
  it('signs the visitor IP and adds an idempotency key only when asked', async () => {
    requestHeaders.current = new Headers({
      'cf-connecting-ip': '2001:db8::1',
      'x-edge-auth': 'test-only-edge-auth-secret-0123456789abcdef',
    });
    const withoutKey = await apiRequestHeaders();
    expect(withoutKey[API_HEADERS.clientIp]).toBe('2001:db8::1');
    expect(withoutKey[API_HEADERS.idempotencyKey]).toBeUndefined();

    const key = '01890a5d-ac96-774b-bcce-b302099a8057';
    expect((await apiRequestHeaders({ idempotencyKey: key }))[API_HEADERS.idempotencyKey]).toBe(
      key,
    );
    const fresh = await apiRequestHeaders({ idempotencyKey: undefined });
    expect(fresh[API_HEADERS.idempotencyKey]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sends no client IP headers without a valid IP', async () => {
    requestHeaders.current = new Headers({ 'x-real-ip': 'not-an-ip' });
    expect(await apiRequestHeaders()).toEqual({});
  });
});

describe('logActionError', () => {
  it('logs status, slug and trace id, never the problem detail', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logActionError('test', apiError(422, '/errors/upload-not-found'));
    logActionError('test', new Error('boom'));
    expect(log).toHaveBeenNthCalledWith(1, '[test] API call failed', {
      kind: 'http',
      status: 422,
      problem: 'upload-not-found',
      traceId: 'trace',
    });
    expect(log).toHaveBeenNthCalledWith(2, '[test] unexpected error', expect.any(Error));
    expect(JSON.stringify(log.mock.calls[0])).not.toContain('secret');
  });
});

describe('focusFirstInvalid', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('waits for errors to render, then focuses the first invalid control in DOM order', async () => {
    const form = document.createElement('form');
    form.innerHTML = '<input id="a" /><input id="b" />';
    document.body.append(form);
    focusFirstInvalid(form);
    // Errors render a frame later.
    requestAnimationFrame(() => {
      form.querySelector('#b')?.setAttribute('aria-invalid', 'true');
      form.querySelector('#a')?.setAttribute('aria-invalid', 'true');
    });
    await vi.waitFor(() => {
      expect(document.activeElement?.id).toBe('a');
    });
  });

  it('gives up quietly when nothing is invalid', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    focusFirstInvalid(form);
    focusFirstInvalid(null);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(document.activeElement).toBe(document.body);
  });
});
