// @ts-check
// Framework-agnostic TypeScript preset, used by shared/*.
import { defineConfig } from 'eslint/config';
import globals from 'globals';

import { core, prettierLast } from './shared.js';

export const base = defineConfig(
  core,
  { name: '@agency/base/globals', languageOptions: { globals: { ...globals.es2023 } } },
  prettierLast,
);

export default base;
