// @ts-check
// Building blocks shared by the exported presets. Each preset is
// `[...core, ...preset-specific, prettier]` so eslint-config-prettier always runs
// last and switches off every stylistic rule that would fight Prettier.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import security from 'eslint-plugin-security';
import { defineConfig, globalIgnores } from 'eslint/config';
import process from 'node:process';
import tseslint from 'typescript-eslint';

const RAW_SQL_MESSAGE =
  'Unsafe raw SQL is banned (doc §9.8). Use the parameterised $queryRaw`...` / $executeRaw`...` tagged templates.';

export const ignores = globalIgnores([
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/out/**',
  '**/coverage/**',
  '**/generated/**',
  '**/.turbo/**',
  '**/next-env.d.ts',
]);

export const core = defineConfig(
  ignores,
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  security.configs.recommended,
  {
    name: '@agency/core',
    languageOptions: {
      parserOptions: {
        // Type-aware linting via the TS project service: each file is checked
        // against its nearest tsconfig.json without listing projects by hand.
        projectService: true,
        // Turbo runs `eslint` from each package directory. Consumers should
        // still override this with `import.meta.dirname` (see README).
        tsconfigRootDir: process.cwd(),
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Doc §13.1: never use `any`; use `unknown` and narrow it.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Doc §13.6: no console logs left behind. Structured loggers (pino) are
      // the norm; console.error / console.warn stay available for last-resort paths.
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-new-func': 'error',

      // Doc §9.8: `$queryRawUnsafe` / `$executeRawUnsafe` are banned. This rule
      // matches `prisma.$queryRawUnsafe(...)`, computed access
      // (`prisma['$queryRawUnsafe']`) and destructuring (`const { $queryRawUnsafe } = prisma`).
      'no-restricted-properties': [
        'error',
        { property: '$queryRawUnsafe', message: RAW_SQL_MESSAGE },
        { property: '$executeRawUnsafe', message: RAW_SQL_MESSAGE },
      ],

      // With TypeScript's noUncheckedIndexedAccess the typed key lookups this
      // rule flags are already safe; it produces mostly false positives.
      'security/detect-object-injection': 'off',
    },
  },
  {
    name: '@agency/js-files',
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    name: '@agency/tests',
    files: ['**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      // Tests deliberately probe invalid input and use non-null assertions on fixtures.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);

/** eslint-config-prettier must be the final entry of every preset. */
export const prettierLast = defineConfig(prettier);
