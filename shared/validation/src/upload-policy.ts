// Zod-free on purpose: re-exported by `@agency/validation/constants` so the
// browser can pre-check a file (type, size) before asking for an upload URL,
// without pulling Zod into the first JS bundle.
import { UPLOAD_LIMITS, type UploadPurpose } from '@agency/config';

export const MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  zip: 'application/zip',
  /** What browsers on Windows report for .zip files. */
  zipWindows: 'application/x-zip-compressed',
} as const;

export interface UploadPolicy {
  readonly mimeTypes: readonly string[];
  readonly maxBytes: number;
}

/**
 * What each upload purpose accepts (plan finding A20). The declared MIME type
 * is only a first filter: the worker re-checks magic bytes (`file-type`) and
 * scans with ClamAV before a file leaves quarantine.
 */
export const ALLOWED_UPLOAD_MIME = {
  cv: {
    mimeTypes: [MIME_TYPES.pdf, MIME_TYPES.docx],
    maxBytes: UPLOAD_LIMITS.cv.maxBytes,
  },
  project: {
    mimeTypes: [
      MIME_TYPES.pdf,
      MIME_TYPES.png,
      MIME_TYPES.jpeg,
      MIME_TYPES.webp,
      MIME_TYPES.zip,
      MIME_TYPES.zipWindows,
      MIME_TYPES.docx,
      MIME_TYPES.xlsx,
    ],
    maxBytes: UPLOAD_LIMITS.project.maxBytes,
  },
  /** CMS images. No SVG: it can carry script, and the worker re-encodes every image. */
  media: {
    mimeTypes: [MIME_TYPES.jpeg, MIME_TYPES.png, MIME_TYPES.webp, MIME_TYPES.avif],
    maxBytes: UPLOAD_LIMITS.media.maxBytes,
  },
} as const satisfies Record<UploadPurpose, UploadPolicy>;

/** True when the declared type and size are allowed for the purpose. */
export function isAllowedUpload(purpose: UploadPurpose, mimeType: string, sizeBytes: number) {
  const policy: UploadPolicy = ALLOWED_UPLOAD_MIME[purpose];
  return policy.mimeTypes.includes(mimeType) && sizeBytes <= policy.maxBytes;
}
