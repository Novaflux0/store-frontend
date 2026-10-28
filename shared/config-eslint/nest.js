// @ts-check
// Preset for the backend (NestJS 11, Node 24, CommonJS output).
import { defineConfig } from 'eslint/config';
import globals from 'globals';

import { core, prettierLast } from './shared.js';

export const nest = defineConfig(
  core,
  {
    name: '@agency/nest',
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Nest modules are empty classes carrying a @Module() decorator.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      // Nest DI reads constructor parameter types at runtime through
      // emitDecoratorMetadata. Rewriting those imports as `import type` erases
      // the metadata and breaks injection, so this rule is off here.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  prettierLast,
);

export default nest;
