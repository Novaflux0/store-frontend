import type * as Validation from '@agency/validation';

/**
 * Loads `@agency/validation` (and Zod) in the browser, in its own chunk, with Zod's
 * JIT switched off first. Zod 4 compiles object parsers with `new Function` and
 * probes for it when the first schema is created; under the enforced CSP (no
 * `'unsafe-eval'`) that probe is reported as a violation. `jitless` skips both.
 * The setting must be applied before the schema module evaluates.
 */
let pending: Promise<typeof Validation> | undefined;

export function loadValidation(): Promise<typeof Validation> {
  pending ??= import('zod').then(({ config }) => {
    config({ jitless: true });
    return import('@agency/validation');
  });
  return pending;
}
