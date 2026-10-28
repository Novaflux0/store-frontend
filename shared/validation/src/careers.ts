import { z } from 'zod';

import {
  consentSchema,
  emailSchema,
  honeypotSchema,
  httpsUrlSchema,
  nameSchema,
  optionalField,
  phoneSchema,
  slugSchema,
  turnstileTokenSchema,
  uuidV7Schema,
} from './common.js';
import { FIELD_LIMITS } from './limits.js';

/**
 * Body of `POST /careers/applications`. The CV is uploaded first through
 * `POST /files/upload-url` (purpose `cv`); its `fileId` is sent here.
 */
export const jobApplicationSchema = z.strictObject({
  /** Slug of the job's MDX file, e.g. `senior-frontend-engineer`. */
  jobSlug: slugSchema,
  name: nameSchema,
  email: emailSchema,
  phone: optionalField(phoneSchema),
  portfolioUrl: optionalField(httpsUrlSchema),
  coverLetter: z
    .string()
    .trim()
    .max(
      FIELD_LIMITS.coverLetterMax,
      `Cover letter must be at most ${FIELD_LIMITS.coverLetterMax} characters.`,
    )
    .optional(),
  cvFileId: uuidV7Schema,
  turnstileToken: turnstileTokenSchema,
  extraNote: honeypotSchema,
  consent: consentSchema,
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
