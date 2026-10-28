'use server';

import { z } from 'zod';

import { API_ROUTES, PROBLEM_TYPES } from '@agency/types';
import { jobApplicationSchema, publicUploadRequestSchema } from '@agency/validation';

import { ApiError, apiPost, problemSlug } from '@/lib/api';
import { ACTION_MESSAGES, firstMessages } from '@/lib/forms/action-result';
import { apiRequestHeaders, describeApiFailure, logActionError } from '@/lib/forms/server-action';

import {
  APPLICATION_MESSAGES,
  CV_FIELD_ALIASES,
  type RequestCvUploadResult,
  type SubmitApplicationResult,
} from './application-result';

/** What the browser needs from `UploadUrlResponse`; anything else is a broken response. */
const uploadTargetSchema = z.object({
  fileId: z.string().min(1),
  uploadUrl: z.url({ protocol: /^https?$/ }),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});

/**
 * Step 1 of the careers flow (plan I2-1, I2-3): asks the API for a presigned PUT URL
 * for the CV. Protected by its own Turnstile token; the browser then uploads the file
 * straight to storage and resets the widget for the second token.
 */
export async function requestCvUpload(input: unknown): Promise<RequestCvUploadResult> {
  const parsed = publicUploadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: ACTION_MESSAGES.invalid,
      fieldErrors: firstMessages(z.flattenError(parsed.error).fieldErrors, CV_FIELD_ALIASES),
    };
  }
  try {
    // A fresh key per attempt: a replayed response would carry an expired URL.
    const response = await apiPost(API_ROUTES.files.uploadUrl, parsed.data, {
      headers: await apiRequestHeaders({ idempotencyKey: undefined }),
    });
    const target = uploadTargetSchema.safeParse(response);
    if (!target.success) {
      console.error('[requestCvUpload] unexpected upload-url response shape');
      return { ok: false, message: ACTION_MESSAGES.generic };
    }
    const { fileId, uploadUrl, headers, expiresAt } = target.data;
    return { ok: true, upload: { fileId, uploadUrl, headers, expiresAt } };
  } catch (error) {
    logActionError('requestCvUpload', error);
    return describeApiFailure(error, CV_FIELD_ALIASES);
  }
}

/**
 * Step 2: submits the application with the uploaded CV's `fileId` and a second,
 * fresh Turnstile token. 202 means stored; the CV is scanned asynchronously.
 */
export async function submitApplication(
  input: unknown,
  idempotencyKey: unknown,
): Promise<SubmitApplicationResult> {
  const parsed = jobApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: ACTION_MESSAGES.invalid,
      fieldErrors: firstMessages(z.flattenError(parsed.error).fieldErrors, CV_FIELD_ALIASES),
    };
  }
  try {
    await apiPost(API_ROUTES.careers.applications, parsed.data, {
      headers: await apiRequestHeaders({ idempotencyKey }),
    });
    return { ok: true };
  } catch (error) {
    logActionError('submitApplication', error);
    if (error instanceof ApiError) {
      const slug = problemSlug(error);
      if (
        (error.status === 422 && slug === PROBLEM_TYPES.uploadNotFound) ||
        (error.status === 409 && slug === PROBLEM_TYPES.uploadAlreadyUsed)
      ) {
        return {
          ok: false,
          reason: 'reattach-cv',
          message: APPLICATION_MESSAGES.reattachCv,
          fieldErrors: { cv: APPLICATION_MESSAGES.reattachCv },
        };
      }
      if (error.status === 409 && slug === PROBLEM_TYPES.idempotencyKeyInUse) {
        return { ok: false, message: APPLICATION_MESSAGES.inProgress };
      }
    }
    return describeApiFailure(error, CV_FIELD_ALIASES);
  }
}
