import { UPLOAD_PURPOSES, type UploadPurpose } from '@agency/config';
import { z } from 'zod';

import { honeypotSchema, turnstileTokenSchema } from './common.js';
import { FIELD_LIMITS } from './limits.js';
import { ALLOWED_UPLOAD_MIME, type UploadPolicy } from './upload-policy.js';

// The upload policy lives in a Zod-free module (served by
// `@agency/validation/constants`) and is re-exported here for existing imports.
export {
  ALLOWED_UPLOAD_MIME,
  MIME_TYPES,
  isAllowedUpload,
  type UploadPolicy,
} from './upload-policy.js';

const BYTES_PER_MEBIBYTE = 1024 * 1024;

/**
 * The display name of an uploaded file. Storage keys are generated server-side,
 * so this name is never used as a path; it is still restricted to a plain file
 * name: no path separators, no characters Windows forbids, no control
 * characters and no leading dot (hidden files, `..`).
 */
export const fileNameSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .min(1, 'File name is required.')
  .max(
    FIELD_LIMITS.fileNameMax,
    `File name must be at most ${FIELD_LIMITS.fileNameMax} characters.`,
  )
  .regex(/^(?!\.)[^/\\<>:"|?*\p{Cc}]+$/u, 'File name contains characters that are not allowed.');

/** Fields describing the file, shared by the authenticated and the public upload request. */
const uploadFileFields = {
  fileName: fileNameSchema,
  mimeType: z.string().trim().toLowerCase().min(1).max(FIELD_LIMITS.mimeTypeMax),
  sizeBytes: z.int().positive('File is empty.'),
};

interface DeclaredUpload {
  readonly purpose: UploadPurpose;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

/** Adds an issue when the declared type or size is not allowed for the purpose. */
function checkUploadPolicy(upload: DeclaredUpload, ctx: z.RefinementCtx) {
  const policy: UploadPolicy = ALLOWED_UPLOAD_MIME[upload.purpose];
  if (!policy.mimeTypes.includes(upload.mimeType)) {
    ctx.addIssue({
      code: 'custom',
      path: ['mimeType'],
      message: 'This file type is not allowed.',
    });
  }
  if (upload.sizeBytes > policy.maxBytes) {
    const maxMebibytes = policy.maxBytes / BYTES_PER_MEBIBYTE;
    ctx.addIssue({
      code: 'custom',
      path: ['sizeBytes'],
      message: `File is too large (maximum ${maxMebibytes} MB).`,
    });
  }
}

/** Body of `POST /files/upload-url` for signed-in users (any purpose). */
export const requestUploadSchema = z
  .strictObject({
    purpose: z.enum(UPLOAD_PURPOSES),
    ...uploadFileFields,
  })
  .superRefine(checkUploadPolicy);

/**
 * Body of `POST /files/upload-url` for anonymous visitors (plan I2-2): only a
 * careers CV, protected by its own Turnstile token (I2-1). Same type and size
 * checks as `requestUploadSchema`.
 */
export const publicUploadRequestSchema = z
  .strictObject({
    purpose: z.literal('cv', 'Only CV uploads are allowed.'),
    ...uploadFileFields,
    turnstileToken: turnstileTokenSchema,
    extraNote: honeypotSchema,
  })
  .superRefine(checkUploadPolicy);

export type RequestUploadInput = z.infer<typeof requestUploadSchema>;
export type PublicUploadRequestInput = z.infer<typeof publicUploadRequestSchema>;
