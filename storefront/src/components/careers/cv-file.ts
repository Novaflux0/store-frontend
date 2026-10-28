import { ALLOWED_UPLOAD_MIME, FIELD_LIMITS, MIME_TYPES } from '@agency/validation/constants';

/**
 * Browser-side CV checks against the shared upload policy (Zod-free constants
 * subpath, plan I2-11). They only spare a round trip: the API validates the declared
 * type and size again, and the worker checks magic bytes and scans the file.
 */

const CV_POLICY = ALLOWED_UPLOAD_MIME.cv;
const BYTES_PER_MEBIBYTE = 1024 * 1024;

export const CV_MAX_MEBIBYTES = CV_POLICY.maxBytes / BYTES_PER_MEBIBYTE;

/** `accept` attribute: extensions for the file picker plus the MIME types. */
export const CV_ACCEPT = ['.pdf', '.docx', ...CV_POLICY.mimeTypes].join(',');

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  pdf: MIME_TYPES.pdf,
  docx: MIME_TYPES.docx,
};

/**
 * The MIME type to declare for a file. Some systems report an empty `type` for .docx
 * (no Office installed); the extension is used then. The same value is signed into the
 * upload URL and sent as `Content-Type` with the PUT, so they always match.
 */
export function cvMimeType(file: Pick<File, 'name' | 'type'>): string {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? '';
}

/** Error message for a CV the API would refuse, or `null` when it may be uploaded. */
export function checkCvFile(file: File | null | undefined): string | null {
  if (!file) return 'Attach your CV.';
  if (!(CV_POLICY.mimeTypes as readonly string[]).includes(cvMimeType(file))) {
    return 'Attach your CV as a PDF or Word (.docx) file.';
  }
  if (file.size === 0) return 'This file is empty.';
  if (file.size > CV_POLICY.maxBytes) {
    return `This file is too large. The maximum is ${CV_MAX_MEBIBYTES.toString()} MB.`;
  }
  if (file.name.length > FIELD_LIMITS.fileNameMax) return 'Rename the file to a shorter name.';
  return null;
}
