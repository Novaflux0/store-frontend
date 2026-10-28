import type { ActionFailure } from '@/lib/forms/action-result';

/** Results of the careers Server Actions, safe to show in the browser. */

/** A presigned upload target from `POST /files/upload-url` (plan I2-3). */
export interface CvUploadTarget {
  /** Submitted with the application as `cvFileId`. */
  readonly fileId: string;
  readonly uploadUrl: string;
  /** Send exactly these with the `PUT` (the signature covers them). */
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
}

export type RequestCvUploadResult =
  { readonly ok: true; readonly upload: CvUploadTarget } | ActionFailure;

export type SubmitApplicationResult =
  | { readonly ok: true }
  | (ActionFailure & {
      /**
       * `reattach-cv`: the upload is missing, expired, mismatched (422 `upload-not-found`)
       * or already used (409 `upload-already-used`); the visitor must attach the CV again.
       */
      readonly reason?: 'reattach-cv';
    });

export const APPLICATION_MESSAGES = {
  reattachCv: 'Please attach your CV again. Your upload expired or could not be found.',
  inProgress: 'Your application is still being processed. Please wait a moment and try again.',
  privacyNote: 'Your CV is virus-scanned and shared only with the hiring team.',
} as const;

/**
 * Contract field names that belong to the CV control in the form: upload request
 * fields and the application's `cvFileId`.
 */
export const CV_FIELD_ALIASES: Readonly<Record<string, string>> = {
  fileName: 'cv',
  mimeType: 'cv',
  sizeBytes: 'cv',
  purpose: 'cv',
  cvFileId: 'cv',
};
