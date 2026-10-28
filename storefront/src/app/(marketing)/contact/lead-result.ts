import { z } from 'zod';

import type { ProblemDetails } from '@agency/types';

/** Result of the `submitLead` Server Action, safe to show in the browser. */
export type SubmitLeadResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly message: string;
      /** First message per field path (`"email"`, `"service"`, …). */
      readonly fieldErrors?: Readonly<Record<string, string>>;
    };

export const LEAD_MESSAGES = {
  invalid: 'Please check the highlighted fields and try again.',
  rateLimited: 'Too many requests, try again later.',
  generic: 'Something went wrong on our side. Please try again in a moment.',
} as const;

export type LeadFailure =
  | { readonly kind: 'invalid'; readonly error: z.ZodError }
  | { readonly kind: 'api'; readonly status: number; readonly problem: ProblemDetails | null }
  | { readonly kind: 'unexpected'; readonly contactEmail: string };

function firstMessages(
  errors: Readonly<Record<string, readonly string[] | undefined>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(errors)) {
    const first = messages?.[0];
    if (first) result[field] = first;
  }
  return result;
}

/**
 * Maps a failure to user-facing copy. Internal details (problem `detail`, trace ids,
 * stack traces) never reach the browser (doc §13.4).
 */
export function toLeadResult(failure: LeadFailure): SubmitLeadResult {
  switch (failure.kind) {
    case 'invalid':
      return {
        ok: false,
        message: LEAD_MESSAGES.invalid,
        fieldErrors: firstMessages(z.flattenError(failure.error).fieldErrors),
      };
    case 'api': {
      if (failure.status === 429) return { ok: false, message: LEAD_MESSAGES.rateLimited };
      const errors = failure.problem?.errors;
      if (failure.status === 400 && errors) {
        return { ok: false, message: LEAD_MESSAGES.invalid, fieldErrors: firstMessages(errors) };
      }
      return { ok: false, message: LEAD_MESSAGES.generic };
    }
    case 'unexpected':
      return {
        ok: false,
        message: `${LEAD_MESSAGES.generic} You can also email us at ${failure.contactEmail}.`,
      };
  }
}
