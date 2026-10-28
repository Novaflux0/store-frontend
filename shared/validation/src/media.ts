import { z } from 'zod';

import { cursorQuerySchema, uuidV7Schema } from './common.js';
import { fileNameSchema } from './files.js';
import { FIELD_LIMITS } from './limits.js';
import { ALLOWED_UPLOAD_MIME } from './upload-policy.js';

/** Media library (ADR 0017): staff upload images; the worker scans and resizes them. */

const BYTES_PER_MEBIBYTE = 1024 * 1024;
const MEDIA_POLICY = ALLOWED_UPLOAD_MIME.media;

/** Alternative text is required on every image (WCAG 1.1.1). */
export const altTextSchema = z
  .string()
  .trim()
  .min(1, 'Describe the image for people who cannot see it.')
  .max(200, 'Alt text must be at most 200 characters.');

/** `POST /admin/media/upload-url`. */
export const mediaUploadRequestSchema = z.strictObject({
  fileName: fileNameSchema,
  mimeType: z
    .string()
    .trim()
    .toLowerCase()
    .max(FIELD_LIMITS.mimeTypeMax)
    .refine(
      (type) => (MEDIA_POLICY.mimeTypes as readonly string[]).includes(type),
      'Upload a JPEG, PNG, WebP or AVIF image.',
    ),
  sizeBytes: z
    .int()
    .positive('File is empty.')
    .max(
      MEDIA_POLICY.maxBytes,
      `Image is too large (maximum ${MEDIA_POLICY.maxBytes / BYTES_PER_MEBIBYTE} MB).`,
    ),
});

/** `POST /admin/media`: claims an uploaded file for the library once it is in storage. */
export const createMediaSchema = z.strictObject({
  fileId: uuidV7Schema,
  alt: altTextSchema,
});

/** `PATCH /admin/media/:id`. */
export const updateMediaSchema = z.strictObject({ alt: altTextSchema });

export const mediaQuerySchema = cursorQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});

export type MediaUploadRequestInput = z.infer<typeof mediaUploadRequestSchema>;
export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type MediaQuery = z.infer<typeof mediaQuerySchema>;
