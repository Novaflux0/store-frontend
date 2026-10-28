import { z } from 'zod';

import { emailSchema, honeypotSchema, opaqueTokenSchema, turnstileTokenSchema } from './common.js';

/** Body of `POST /newsletter/subscribe` (double opt-in: a confirm email follows). */
export const newsletterSubscribeSchema = z.strictObject({
  email: emailSchema,
  turnstileToken: turnstileTokenSchema,
  extraNote: honeypotSchema,
});

/** Body of `POST /newsletter/confirm` and `POST /newsletter/unsubscribe`. */
export const newsletterTokenSchema = z.strictObject({
  token: opaqueTokenSchema,
});

/**
 * Body of `POST /newsletter/confirm`: the token from the confirmation email
 * link, posted only when the visitor clicks the button (plan I2-7).
 */
export const newsletterConfirmSchema = newsletterTokenSchema;

/**
 * Body of `POST /newsletter/unsubscribe`: the per-subscriber unsubscribe token
 * from a newsletter email, posted only when the visitor clicks the button (I2-7).
 */
export const newsletterUnsubscribeSchema = newsletterTokenSchema;

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
export type NewsletterTokenInput = z.infer<typeof newsletterTokenSchema>;
export type NewsletterConfirmInput = z.infer<typeof newsletterConfirmSchema>;
export type NewsletterUnsubscribeInput = z.infer<typeof newsletterUnsubscribeSchema>;
