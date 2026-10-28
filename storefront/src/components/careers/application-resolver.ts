import type { FieldErrors, Resolver } from 'react-hook-form';

import type { JobApplicationInput } from '@agency/validation';

import { checkCvFile } from './cv-file';
import { loadValidation } from '@/lib/forms/load-validation';

/** What the apply form holds while editing. */
export interface ApplicationFormValues {
  name: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  coverLetter: string;
  consent: boolean;
  turnstileToken: string;
  /** Honeypot: stays empty for people. */
  extraNote: string;
  cv: FileList | null;
}

/**
 * Validated form output: the shared `jobApplicationSchema` without the fields the
 * flow adds later (`jobSlug` from the page, `cvFileId` after the upload), plus the file.
 */
export type ApplicationFields = Omit<JobApplicationInput, 'cvFileId' | 'jobSlug'> & {
  readonly cv: File;
};

type SchemaValues = Omit<ApplicationFormValues, 'cv'>;
type SchemaResolver = Resolver<SchemaValues, unknown, Omit<ApplicationFields, 'cv'>>;
type ApplicationResolver = Resolver<ApplicationFormValues, unknown, ApplicationFields>;

let pending: Promise<SchemaResolver> | undefined;

/**
 * Loads Zod, the shared schema and `zodResolver` in their own chunk, so they stay out
 * of the job page's first-load JavaScript (same pattern as the contact form). The
 * form calls this right after mount.
 */
export function loadApplicationResolver(): Promise<SchemaResolver> {
  pending ??= Promise.all([import('@hookform/resolvers/zod'), loadValidation()]).then(
    ([{ zodResolver }, { jobApplicationSchema }]) =>
      zodResolver(
        jobApplicationSchema.omit({ cvFileId: true, jobSlug: true }),
      ) as unknown as SchemaResolver,
  );
  return pending;
}

/** RHF resolver: the shared schema for the text fields, the upload policy for the CV. */
export const applicationResolver: ApplicationResolver = async (values, context, options) => {
  const resolve = await loadApplicationResolver();
  const { cv, ...rest } = values;
  const result = await resolve(rest, context, options as unknown as Parameters<SchemaResolver>[2]);
  const file = cv?.item(0) ?? null;
  const cvError = checkCvFile(file);
  const errors: FieldErrors<ApplicationFormValues> = {
    ...result.errors,
    ...(cvError ? { cv: { type: 'validate', message: cvError } } : {}),
  };
  if (Object.keys(errors).length > 0 || !file) return { values: {}, errors };
  return { values: { ...(result.values as Omit<ApplicationFields, 'cv'>), cv: file }, errors: {} };
};
