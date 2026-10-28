import type { ActionFailure } from '@/lib/forms/action-result';

/** Results of the newsletter Server Actions, safe to show in the browser. */

export type NewsletterSubscribeResult = { readonly ok: true } | ActionFailure;

export type NewsletterTokenResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      /** `invalid`: the link is wrong, used or expired. `retry`: try the same link again later. */
      readonly reason: 'invalid' | 'retry';
      readonly message: string;
    };

export const NEWSLETTER_MESSAGES = {
  /** Identical for new and existing addresses (anti-enumeration, plan I2-6). */
  subscribed: 'Check your inbox to confirm your subscription.',
  invalidLink: 'This link is invalid or has expired.',
} as const;
