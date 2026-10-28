import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_HEADERS, API_ROUTES } from '@agency/types';
import { MIME_TYPES } from '@agency/validation';

import type * as ApiModule from '@/lib/api';
import { ApiError } from '@/lib/api';

import { requestCvUpload, submitApplication } from './actions';

const apiPost = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ 'x-forwarded-for': '198.51.100.4, 10.0.0.1' })),
}));
vi.mock('@/lib/env/server', () => ({
  getServerEnv: () => ({
    API_BASE_URL: 'http://api.test',
    CLIENT_IP_HMAC_SECRET: 'test-only-client-ip-secret-0123456789abcdef',
  }),
}));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  apiPost,
}));

const KEY = '01890a5d-ac96-774b-bcce-b302099a8057';
const FILE_ID = '01890a5d-ac96-774b-bcce-b302099a8058';

const UPLOAD_REQUEST = {
  purpose: 'cv',
  fileName: 'ada-cv.pdf',
  mimeType: MIME_TYPES.pdf,
  sizeBytes: 2048,
  turnstileToken: 'first',
};

const UPLOAD_RESPONSE = {
  fileId: FILE_ID,
  uploadUrl: 'http://localhost:9000/quarantine/key?sig=1',
  method: 'PUT',
  headers: { 'Content-Type': MIME_TYPES.pdf, 'Content-Length': '2048' },
  expiresAt: '2026-10-21T12:05:00.000Z',
};

const APPLICATION = {
  jobSlug: 'senior-frontend-engineer',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '',
  portfolioUrl: '',
  coverLetter: '',
  cvFileId: FILE_ID,
  turnstileToken: 'second',
  consent: true,
};

function problem(
  status: number,
  slug: string,
  errors?: Readonly<Record<string, readonly string[]>>,
): ApiError {
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

describe('requestCvUpload', () => {
  it('asks the API for a presigned URL with a fresh idempotency key and the client IP', async () => {
    apiPost.mockResolvedValue(UPLOAD_RESPONSE);
    await expect(requestCvUpload(UPLOAD_REQUEST)).resolves.toEqual({
      ok: true,
      upload: {
        fileId: FILE_ID,
        uploadUrl: UPLOAD_RESPONSE.uploadUrl,
        headers: UPLOAD_RESPONSE.headers,
        expiresAt: UPLOAD_RESPONSE.expiresAt,
      },
    });
    const [route, body, options] = apiPost.mock.calls[0] as [string, unknown, CallOptions];
    expect(route).toBe(API_ROUTES.files.uploadUrl);
    expect(body).toEqual(UPLOAD_REQUEST);
    expect(options.headers[API_HEADERS.idempotencyKey]).toMatch(/^[0-9a-f-]{36}$/);
    expect(options.headers[API_HEADERS.clientIp]).toBe('198.51.100.4');
  });

  it('maps schema errors on the file fields to the CV control', async () => {
    const result = await requestCvUpload({
      ...UPLOAD_REQUEST,
      mimeType: 'image/png',
      sizeBytes: 50 * 1024 * 1024,
    });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { cv: 'This file type is not allowed.' },
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('refuses project uploads from the public form', async () => {
    const result = await requestCvUpload({ ...UPLOAD_REQUEST, purpose: 'project' });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { cv: 'Only CV uploads are allowed.' },
    });
  });

  it('treats a malformed API response as a generic failure', async () => {
    apiPost.mockResolvedValue({ ...UPLOAD_RESPONSE, uploadUrl: 'javascript:alert(1)' });
    await expect(requestCvUpload(UPLOAD_REQUEST)).resolves.toEqual({
      ok: false,
      message: 'Something went wrong on our side. Please try again in a moment.',
    });
  });

  it.each([
    [
      problem(400, 'validation-error', { sizeBytes: ['File is too large.'] }),
      { cv: 'File is too large.' },
    ],
    [
      problem(403, 'verification-failed'),
      { turnstileToken: expect.stringMatching(/security check/) as unknown },
    ],
  ])('maps API field problems (%#)', async (error, fieldErrors) => {
    apiPost.mockRejectedValue(error);
    await expect(requestCvUpload(UPLOAD_REQUEST)).resolves.toMatchObject({
      ok: false,
      fieldErrors,
    });
  });

  it.each([
    [problem(429, 'rate-limited'), 'Too many requests, try again later.'],
    [problem(503, 'service-unavailable'), /temporarily unavailable/],
    [problem(403, 'forbidden'), /Something went wrong/],
    [problem(400, 'bad-request'), /Something went wrong/],
  ])('maps %o to a message', async (error, message) => {
    apiPost.mockRejectedValue(error);
    const result = await requestCvUpload(UPLOAD_REQUEST);
    expect(result.ok ? '' : result.message).toMatch(message);
  });
});

describe('submitApplication', () => {
  it('re-validates and submits with the browser idempotency key', async () => {
    apiPost.mockResolvedValue({ id: 'x', status: 'received' });
    await expect(submitApplication(APPLICATION, KEY)).resolves.toEqual({ ok: true });
    const [route, body, options] = apiPost.mock.calls[0] as [string, unknown, CallOptions];
    expect(route).toBe(API_ROUTES.careers.applications);
    expect(body).toEqual(APPLICATION);
    expect(options.headers[API_HEADERS.idempotencyKey]).toBe(KEY);
  });

  it('returns field errors for invalid input, mapping cvFileId to the CV control', async () => {
    const result = await submitApplication({ ...APPLICATION, cvFileId: 'nope', name: '' }, KEY);
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { cv: 'Must be a valid UUID v7.', name: 'Enter your name.' },
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it.each([
    [422, 'upload-not-found'],
    [409, 'upload-already-used'],
  ])('asks to attach the CV again on %i %s', async (status, slug) => {
    apiPost.mockRejectedValue(problem(status, slug));
    await expect(submitApplication(APPLICATION, KEY)).resolves.toEqual({
      ok: false,
      reason: 'reattach-cv',
      message: 'Please attach your CV again. Your upload expired or could not be found.',
      fieldErrors: {
        cv: 'Please attach your CV again. Your upload expired or could not be found.',
      },
    });
  });

  it('asks to wait while the same submission is still being processed', async () => {
    apiPost.mockRejectedValue(problem(409, 'idempotency-key-in-use'));
    await expect(submitApplication(APPLICATION, KEY)).resolves.toMatchObject({
      ok: false,
      message: expect.stringMatching(/still being processed/) as unknown,
    });
  });

  it.each([
    [
      problem(400, 'validation-error', { cvFileId: ['Unknown file.'] }),
      { fieldErrors: { cv: 'Unknown file.' } },
    ],
    [
      problem(403, 'verification-failed'),
      { message: expect.stringMatching(/security check/) as unknown },
    ],
    [
      problem(409, 'conflict'),
      { message: expect.stringMatching(/Something went wrong/) as unknown },
    ],
    [problem(429, 'rate-limited'), { message: 'Too many requests, try again later.' }],
    [
      problem(503, 'service-unavailable'),
      { message: expect.stringMatching(/unavailable/) as unknown },
    ],
    [new Error('boom'), { message: expect.stringMatching(/Something went wrong/) as unknown }],
  ])('maps other failures (%#)', async (error, expected) => {
    apiPost.mockRejectedValue(error);
    const result = await submitApplication(APPLICATION, KEY);
    expect(result).toMatchObject({ ok: false, ...expected });
    expect(result).not.toHaveProperty('reason');
  });
});
