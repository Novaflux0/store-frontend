import { describe, expect, it } from 'vitest';

import {
  ALLOWED_UPLOAD_MIME,
  MIME_TYPES,
  fileNameSchema,
  isAllowedUpload,
  publicUploadRequestSchema,
  requestUploadSchema,
} from './files.js';

const MEBIBYTE = 1024 * 1024;

const cvUpload = {
  purpose: 'cv',
  fileName: 'Grace Hopper CV.pdf',
  mimeType: MIME_TYPES.pdf,
  sizeBytes: 2 * MEBIBYTE,
} as const;

function issuePaths(result: { error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('ALLOWED_UPLOAD_MIME', () => {
  it('allows PDF and DOCX up to 10 MiB for CVs', () => {
    expect(ALLOWED_UPLOAD_MIME.cv.mimeTypes).toEqual([MIME_TYPES.pdf, MIME_TYPES.docx]);
    expect(ALLOWED_UPLOAD_MIME.cv.maxBytes).toBe(10 * MEBIBYTE);
  });

  it('allows up to 100 MiB for project files', () => {
    expect(ALLOWED_UPLOAD_MIME.project.maxBytes).toBe(100 * MEBIBYTE);
  });

  it('exposes the same rule as a helper', () => {
    expect(isAllowedUpload('cv', MIME_TYPES.docx, MEBIBYTE)).toBe(true);
    expect(isAllowedUpload('cv', MIME_TYPES.png, MEBIBYTE)).toBe(false);
    expect(isAllowedUpload('project', MIME_TYPES.zip, 101 * MEBIBYTE)).toBe(false);
  });
});

describe('fileNameSchema', () => {
  it.each(['report.pdf', 'Résumé 2026.docx', 'archive (1).zip'])('accepts %j', (name) => {
    expect(fileNameSchema.safeParse(name).success).toBe(true);
  });

  it.each([
    '',
    '../../etc/passwd',
    'folder/file.pdf',
    String.raw`C:\temp\file.pdf`,
    '.htaccess',
    'bad\u0000name.pdf',
    'what?.pdf',
    `${'a'.repeat(252)}.pdf`,
  ])('rejects %j', (name) => {
    expect(fileNameSchema.safeParse(name).success).toBe(false);
  });
});

describe('requestUploadSchema', () => {
  it('accepts an allowed upload and normalises the MIME type', () => {
    const parsed = requestUploadSchema.parse({ ...cvUpload, mimeType: ' Application/PDF ' });
    expect(parsed.mimeType).toBe(MIME_TYPES.pdf);
  });

  it('rejects a MIME type the purpose does not allow', () => {
    const result = requestUploadSchema.safeParse({ ...cvUpload, mimeType: MIME_TYPES.png });
    expect(issuePaths(result)).toEqual(['mimeType']);
  });

  it('allows that MIME type for project files', () => {
    const result = requestUploadSchema.safeParse({
      ...cvUpload,
      purpose: 'project',
      mimeType: MIME_TYPES.png,
    });
    expect(result.success).toBe(true);
  });

  it('enforces the size limit per purpose', () => {
    const atLimit = { ...cvUpload, sizeBytes: 10 * MEBIBYTE };
    expect(requestUploadSchema.safeParse(atLimit).success).toBe(true);

    const tooBig = requestUploadSchema.safeParse({ ...atLimit, sizeBytes: 10 * MEBIBYTE + 1 });
    expect(issuePaths(tooBig)).toEqual(['sizeBytes']);
    expect(tooBig.error?.issues[0]?.message).toBe('File is too large (maximum 10 MB).');

    const project = { ...atLimit, purpose: 'project', sizeBytes: 50 * MEBIBYTE };
    expect(requestUploadSchema.safeParse(project).success).toBe(true);
  });

  it.each([0, -1, 1.5])('rejects size %j', (sizeBytes) => {
    expect(requestUploadSchema.safeParse({ ...cvUpload, sizeBytes }).success).toBe(false);
  });

  it('rejects an unknown purpose without throwing', () => {
    expect(requestUploadSchema.safeParse({ ...cvUpload, purpose: 'avatar' }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(requestUploadSchema.safeParse({ ...cvUpload, bucket: 'public' }).success).toBe(false);
  });
});

describe('publicUploadRequestSchema', () => {
  const publicCv = { ...cvUpload, turnstileToken: 'turnstile-token' } as const;

  it('accepts a CV upload with a Turnstile token', () => {
    const parsed = publicUploadRequestSchema.parse({ ...publicCv, mimeType: ' Application/PDF ' });
    expect(parsed).toEqual({ ...publicCv, mimeType: MIME_TYPES.pdf });
  });

  it('accepts only the cv purpose', () => {
    const result = publicUploadRequestSchema.safeParse({
      ...publicCv,
      purpose: 'project',
      mimeType: MIME_TYPES.pdf,
    });
    expect(issuePaths(result)).toEqual(['purpose']);
  });

  it('requires a Turnstile token', () => {
    const { turnstileToken: _token, ...withoutToken } = publicCv;
    expect(issuePaths(publicUploadRequestSchema.safeParse(withoutToken))).toEqual([
      'turnstileToken',
    ]);
    expect(publicUploadRequestSchema.safeParse({ ...publicCv, turnstileToken: '  ' }).success).toBe(
      false,
    );
  });

  it('applies the CV type and size policy', () => {
    const wrongType = publicUploadRequestSchema.safeParse({
      ...publicCv,
      mimeType: MIME_TYPES.png,
    });
    expect(issuePaths(wrongType)).toEqual(['mimeType']);

    const tooBig = publicUploadRequestSchema.safeParse({
      ...publicCv,
      sizeBytes: 10 * MEBIBYTE + 1,
    });
    expect(issuePaths(tooBig)).toEqual(['sizeBytes']);
    expect(tooBig.error?.issues[0]?.message).toBe('File is too large (maximum 10 MB).');
  });

  it('rejects unsafe file names and unknown fields', () => {
    expect(
      publicUploadRequestSchema.safeParse({ ...publicCv, fileName: '../cv.pdf' }).success,
    ).toBe(false);
    const extra = publicUploadRequestSchema.safeParse({ ...publicCv, bucket: 'files' });
    expect(extra.error?.issues[0]?.code).toBe('unrecognized_keys');
  });
});
