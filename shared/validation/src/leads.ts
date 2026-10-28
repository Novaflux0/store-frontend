import { z } from 'zod';

import {
  consentSchema,
  emailSchema,
  honeypotSchema,
  nameSchema,
  turnstileTokenSchema,
} from './common.js';
import { BUDGET_OPTIONS, SERVICE_OPTIONS, TIMELINE_OPTIONS } from './lead-options.js';
import { FIELD_LIMITS } from './limits.js';

// The option lists live in a Zod-free module (served by `@agency/validation/constants`)
// and are re-exported here for existing imports.
export {
  BUDGET_OPTIONS,
  LEAD_KINDS,
  SERVICE_OPTIONS,
  TIMELINE_OPTIONS,
  type BudgetOption,
  type LeadKind,
  type ServiceOption,
  type TimelineOption,
} from './lead-options.js';

/** Fields shared by every lead form. */
const leadFields = {
  name: nameSchema,
  email: emailSchema,
  company: z
    .string()
    .trim()
    .max(FIELD_LIMITS.companyMax, `Company must be at most ${FIELD_LIMITS.companyMax} characters.`)
    .optional(),
  message: z
    .string()
    .trim()
    .min(
      FIELD_LIMITS.messageMin,
      `Tell us a bit more (at least ${FIELD_LIMITS.messageMin} characters).`,
    )
    .max(FIELD_LIMITS.messageMax, `Message must be at most ${FIELD_LIMITS.messageMax} characters.`),
  turnstileToken: turnstileTokenSchema,
  extraNote: honeypotSchema,
  consent: consentSchema,
};

export const contactLeadSchema = z.strictObject({
  kind: z.literal('contact'),
  ...leadFields,
});

export const inquiryLeadSchema = z.strictObject({
  kind: z.literal('inquiry'),
  ...leadFields,
  service: z.enum(SERVICE_OPTIONS, 'Choose a service.'),
  budget: z.enum(BUDGET_OPTIONS, 'Choose a budget range.'),
  timeline: z.enum(TIMELINE_OPTIONS, 'Choose a timeline.'),
});

/** Body of `POST /leads`: a contact message or a project inquiry, selected by `kind`. */
export const createLeadSchema = z.discriminatedUnion('kind', [
  contactLeadSchema,
  inquiryLeadSchema,
]);

export type ContactLeadInput = z.infer<typeof contactLeadSchema>;
export type InquiryLeadInput = z.infer<typeof inquiryLeadSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
