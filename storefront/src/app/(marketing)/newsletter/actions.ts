'use server';

import { z } from 'zod';

import { API_ROUTES, PROBLEM_TYPES } from '@agency/types';
import {
  newsletterConfirmSchema,
  newsletterSubscribeSchema,
  newsletterUnsubscribeSchema,
} from '@agency/validation';

import { ApiError, apiPost, problemSlug } from '@/lib/api';
import { ACTION_MESSAGES, firstMessages } from '@/lib/forms/action-result';
import { apiRequestHeaders, describeApiFailure, logActionError } from '@/lib/forms/server-action';

import {
  NEWSLETTER_MESSAGES,
  type NewsletterSubscribeResult,
  type NewsletterTokenResult,
} from './newsletter-result';

/**
 * Footer sign-up (double opt-in, plan I2-6). The API answers 202 for every address,
 * so the result never reveals whether an email was already subscribed.
 */
export async function subscribeNewsletter(
  input: unknown,
  idempotencyKey: unknown,
): Promise<NewsletterSubscribeResult> {
  const parsed = newsletterSubscribeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: ACTION_MESSAGES.invalid,
      fieldErrors: firstMessages(z.flattenError(parsed.error).fieldErrors),
    };
  }
  try {
    await apiPost(API_ROUTES.newsletter.subscribe, parsed.data, {
      headers: await apiRequestHeaders({ idempotencyKey }),
    });
    return { ok: true };
  } catch (error) {
    logActionError('subscribeNewsletter', error);
    return describeApiFailure(error);
  }
}

type TokenRoute = typeof API_ROUTES.newsletter.confirm | typeof API_ROUTES.newsletter.unsubscribe;

async function postToken(
  action: string,
  route: TokenRoute,
  schema: typeof newsletterConfirmSchema,
  token: unknown,
): Promise<NewsletterTokenResult> {
  const parsed = schema.safeParse({ token });
  if (!parsed.success) {
    return { ok: false, reason: 'invalid', message: NEWSLETTER_MESSAGES.invalidLink };
  }
  try {
    await apiPost(route, parsed.data, { headers: await apiRequestHeaders() });
    return { ok: true };
  } catch (error) {
    logActionError(action, error);
    if (
      error instanceof ApiError &&
      error.status === 400 &&
      (problemSlug(error) === PROBLEM_TYPES.invalidOrExpiredToken ||
        problemSlug(error) === PROBLEM_TYPES.validationError)
    ) {
      return { ok: false, reason: 'invalid', message: NEWSLETTER_MESSAGES.invalidLink };
    }
    return { ok: false, reason: 'retry', message: describeApiFailure(error).message };
  }
}

/** Confirms a subscription. Called only when the visitor clicks the button (plan I2-7). */
export async function confirmNewsletter(token: unknown): Promise<NewsletterTokenResult> {
  return postToken(
    'confirmNewsletter',
    API_ROUTES.newsletter.confirm,
    newsletterConfirmSchema,
    token,
  );
}

/** Unsubscribes. Called only when the visitor clicks the button (plan I2-7). */
export async function unsubscribeNewsletter(token: unknown): Promise<NewsletterTokenResult> {
  return postToken(
    'unsubscribeNewsletter',
    API_ROUTES.newsletter.unsubscribe,
    newsletterUnsubscribeSchema,
    token,
  );
}
