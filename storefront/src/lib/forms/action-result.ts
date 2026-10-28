/**
 * Shapes and copy shared by the Server Actions behind the public forms. Dependency
 * free: client components import the types (and may import the copy) without
 * pulling Zod or server code into the browser bundle.
 */

/** A failed action, safe to show in the browser (no problem `detail`, no trace ids). */
export interface ActionFailure {
  readonly ok: false;
  readonly message: string;
  /** First message per form field (`"email"`, `"cv"`, …). */
  readonly fieldErrors?: Readonly<Record<string, string>>;
}

export const ACTION_MESSAGES = {
  invalid: 'Please check the highlighted fields and try again.',
  rateLimited: 'Too many requests, try again later.',
  verificationFailed: 'The security check failed. Please complete it again and retry.',
  unavailable: 'This service is temporarily unavailable. Please try again in a few minutes.',
  generic: 'Something went wrong on our side. Please try again in a moment.',
  network: 'We could not reach the server. Check your connection and try again.',
} as const;

/**
 * First message per field. `rename` maps contract field names to form field names,
 * e.g. `{ cvFileId: 'cv' }`, so API errors land on the control the user can fix.
 */
export function firstMessages(
  errors: Readonly<Record<string, readonly string[] | undefined>>,
  rename: Readonly<Record<string, string>> = {},
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(errors)) {
    const first = messages?.[0];
    const target = rename[field] ?? field;
    if (first && !(target in result)) result[target] = first;
  }
  return result;
}
