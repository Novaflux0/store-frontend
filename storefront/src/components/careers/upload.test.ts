import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MIME_TYPES } from '@agency/validation/constants';

import { CV_ACCEPT, CV_MAX_MEBIBYTES, checkCvFile, cvMimeType } from './cv-file';
import { UploadError, uploadFile } from './upload-file';

function file(name: string, type: string, size: number): File {
  const created = new File(['x'], name, { type });
  Object.defineProperty(created, 'size', { value: size });
  return created;
}

describe('CV checks (shared upload policy)', () => {
  it('accepts PDF and DOCX within the size limit', () => {
    expect(checkCvFile(file('cv.pdf', MIME_TYPES.pdf, 1024))).toBeNull();
    expect(checkCvFile(file('cv.docx', MIME_TYPES.docx, 1024))).toBeNull();
    expect(CV_ACCEPT).toContain('.pdf');
    expect(CV_ACCEPT).toContain(MIME_TYPES.docx);
  });

  it('falls back to the extension when the browser reports no type', () => {
    expect(cvMimeType({ name: 'CV.DOCX', type: '' })).toBe(MIME_TYPES.docx);
    expect(cvMimeType({ name: 'cv.pdf', type: '' })).toBe(MIME_TYPES.pdf);
    expect(cvMimeType({ name: 'cv', type: '' })).toBe('');
    expect(checkCvFile(file('cv.docx', '', 10))).toBeNull();
  });

  it('rejects a missing, wrong-type, empty, oversized or badly named file', () => {
    expect(checkCvFile(null)).toBe('Attach your CV.');
    expect(checkCvFile(file('cv.png', 'image/png', 10))).toMatch(/PDF or Word/);
    expect(checkCvFile(file('cv.pdf', MIME_TYPES.pdf, 0))).toBe('This file is empty.');
    expect(checkCvFile(file('cv.pdf', MIME_TYPES.pdf, CV_MAX_MEBIBYTES * 1024 * 1024 + 1))).toBe(
      `This file is too large. The maximum is ${CV_MAX_MEBIBYTES.toString()} MB.`,
    );
    expect(checkCvFile(file(`${'a'.repeat(300)}.pdf`, MIME_TYPES.pdf, 10))).toMatch(/shorter/);
  });
});

/** Minimal XMLHttpRequest double that the test drives by hand. */
class FakeXhr {
  static last: FakeXhr | undefined;
  method = '';
  url = '';
  timeout = 0;
  status = 0;
  headers: Record<string, string> = {};
  body: unknown;
  aborted = false;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable } as ProgressEvent);
  }
  respond(status: number) {
    this.status = status;
    this.onload?.();
  }
}

describe('uploadFile', () => {
  const target = {
    uploadUrl: 'http://localhost:9000/quarantine/key?X-Amz-Signature=abc',
    headers: { 'Content-Type': MIME_TYPES.pdf, 'Content-Length': '1024' },
  };
  const blob = new Blob(['%PDF']);

  beforeEach(() => {
    FakeXhr.last = undefined;
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PUTs the file with the signed headers (minus Content-Length) and reports progress', async () => {
    const onProgress = vi.fn();
    const done = uploadFile(target, blob, { onProgress });
    const xhr = FakeXhr.last!;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe(target.uploadUrl);
    expect(xhr.headers).toEqual({ 'Content-Type': MIME_TYPES.pdf });
    expect(xhr.body).toBe(blob);
    expect(xhr.timeout).toBe(5 * 60 * 1000);

    xhr.progress(512, 1024);
    xhr.progress(0, 0, false);
    xhr.respond(200);
    await expect(done).resolves.toBeUndefined();
    expect(onProgress.mock.calls).toEqual([[0.5], [1]]);
  });

  it.each([
    [
      'an HTTP error',
      (xhr: FakeXhr) => {
        xhr.respond(403);
      },
      'http',
      403,
    ],
    ['a network error', (xhr: FakeXhr) => xhr.onerror?.(), 'network', 0],
    ['a timeout', (xhr: FakeXhr) => xhr.ontimeout?.(), 'timeout', 0],
  ])('rejects on %s', async (_label, fail, kind, status) => {
    const done = uploadFile(target, blob);
    fail(FakeXhr.last!);
    await expect(done).rejects.toMatchObject({ name: 'UploadError', kind, status });
  });

  it('aborts when the signal fires, and refuses an already aborted signal', async () => {
    const controller = new AbortController();
    const done = uploadFile(target, blob, { signal: controller.signal });
    controller.abort();
    await expect(done).rejects.toEqual(new UploadError('aborted'));
    expect(FakeXhr.last?.aborted).toBe(true);

    FakeXhr.last = undefined;
    await expect(uploadFile(target, blob, { signal: controller.signal })).rejects.toMatchObject({
      kind: 'aborted',
    });
    expect(FakeXhr.last).toBeUndefined();
  });

  it('describes failures for logs', () => {
    expect(new UploadError('http', 500).message).toBe('Upload failed: http 500');
    expect(new UploadError('network').message).toBe('Upload failed: network');
  });
});
