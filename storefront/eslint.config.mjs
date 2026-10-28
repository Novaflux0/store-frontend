import { next } from '@agency/config-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
  globalIgnores(['playwright-report/**', 'test-results/**', '.lighthouseci/**']),
  next,
  nextPlugin.configs['core-web-vitals'],
  {
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
  },
  {
    // React Three Fiber elements (<mesh>, <instancedMesh args>…) are not DOM nodes;
    // their props are type-checked by @react-three/fiber's JSX types instead.
    files: ['src/components/three/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
  {
    // Build tooling run from the CLI: prints a report and reads build output paths.
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
);
