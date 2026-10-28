import type { Resolver } from 'react-hook-form';

import type { CreateLeadInput } from '@agency/validation';
import { loadValidation } from '@/lib/forms/load-validation';

/** What the contact form holds while editing; the shared schema turns it into `CreateLeadInput`. */
export interface LeadFormValues {
  kind: CreateLeadInput['kind'];
  name: string;
  email: string;
  company: string;
  message: string;
  service: string;
  budget: string;
  timeline: string;
  consent: boolean;
  turnstileToken: string;
  /** Honeypot: stays empty for people. */
  extraNote: string;
}

type LeadResolver = Resolver<LeadFormValues, unknown, CreateLeadInput>;

let pending: Promise<LeadResolver> | undefined;

/**
 * Loads Zod, the shared `createLeadSchema` (ADR 0011) and `zodResolver` in their own
 * chunk, so they stay out of the contact page's first-load JavaScript (~45 KB gzip).
 * The form calls this right after mount, so it is ready before the first submit.
 *
 * The cast is needed because untouched fields hold `""` / `false`, which are not
 * schema input types; the schema rejects them with its own messages.
 * `shouldUnregister` drops the hidden inquiry-only fields, so the strict contact
 * schema never sees them.
 */
export function loadLeadResolver(): Promise<LeadResolver> {
  pending ??= Promise.all([import('@hookform/resolvers/zod'), loadValidation()]).then(
    ([{ zodResolver }, { createLeadSchema }]) =>
      zodResolver(createLeadSchema) as unknown as LeadResolver,
  );
  return pending;
}

/** RHF resolver that defers to the lazily loaded schema resolver. */
export const leadResolver: LeadResolver = async (values, context, options) => {
  const resolve = await loadLeadResolver();
  return resolve(values, context, options);
};
