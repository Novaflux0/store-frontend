// @ts-check
// Preset for the Next.js apps, storefront/ and admin/ (Next.js 16 + React 19). Each app adds
// `@next/eslint-plugin-next` itself, because it must match the installed `next`:
//
//   import nextPlugin from '@next/eslint-plugin-next';
//   export default defineConfig(next, nextPlugin.configs['core-web-vitals']);
import { createRequire } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';

import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { core, prettierLast } from './shared.js';

const REACT_FILES = ['**/*.{js,jsx,mjs,ts,tsx}'];

/** Used when React cannot be resolved from the project ESLint runs in. */
const FALLBACK_REACT_VERSION = '19.0';

/**
 * eslint-plugin-react's `version: 'detect'` calls `context.getFilename()`, which
 * ESLint 10 removed ("getFilename is not a function"). Read the installed React
 * version once, at config load, instead. React is resolved from the consuming
 * project (ESLint's working directory, e.g. storefront/), not from this package,
 * which does not depend on React.
 * @returns {string}
 */
function installedReactVersion() {
  try {
    const requireFromProject = createRequire(join(process.cwd(), 'package.json'));
    /** @type {{ version?: unknown }} */
    const reactPackage = requireFromProject('react/package.json');
    return typeof reactPackage.version === 'string' ? reactPackage.version : FALLBACK_REACT_VERSION;
  } catch {
    return FALLBACK_REACT_VERSION;
  }
}

export const next = defineConfig(
  core,
  {
    name: '@agency/next/react',
    files: REACT_FILES,
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: installedReactVersion() },
    },
    rules: {
      // Doc §9.5 / §9.8: no raw HTML injection. A reviewed exception (e.g. JSON-LD
      // built from trusted data) needs an inline eslint-disable with a reason.
      'react/no-danger': 'error',
      'react/no-danger-with-children': 'error',
      // Blocks `javascript:` URLs and reverse-tabnabbing links.
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': 'error',
      // TypeScript types replace runtime prop-types.
      'react/prop-types': 'off',
    },
  },
  prettierLast,
);

export default next;
