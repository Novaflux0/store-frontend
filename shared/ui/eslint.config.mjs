import { next } from '@agency/config-eslint';
import { defineConfig } from 'eslint/config';

// The `next` preset carries the React, hooks and jsx-a11y rules; this package has no
// Next.js-specific code, so the Next plugin is not added.
export default defineConfig(next, {
  languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
});
