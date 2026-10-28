import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Doc §14: at least 80% coverage on business logic, enforced in CI.
const COVERAGE_THRESHOLD_PERCENT = 80;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
      {
        find: 'server-only',
        replacement: fileURLToPath(new URL('./test/server-only.ts', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    // jsdom + user-event form tests under coverage, sharing a small CI runner with
    // the other turbo tasks: the first test of a file pays the cold start and can
    // pass the 5 s default.
    testTimeout: 15_000,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      // Business logic, the content pipeline, the forms and their Server Actions.
      // Pages, 3D scenes and animation wrappers are covered by the Playwright suite.
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/app/**/contact/*.ts',
        'src/app/**/newsletter/*.ts',
        'src/app/**/careers/*.ts',
        'src/components/sections/ContactForm.tsx',
        'src/components/sections/lead-resolver.ts',
        'src/components/careers/*.{ts,tsx}',
        'src/components/newsletter/*.tsx',
        'src/components/content/*.tsx',
        'src/components/three/device-tier.ts',
        'src/components/three/journey/journey-math.ts',
        'src/components/three/journey/bulb-math.ts',
        'src/components/three/journey/bulb-input.ts',
        'src/components/sections/home/format-stat.ts',
        'src/components/sections/TypedPhrases.tsx',
        'src/components/sections/home/StatCounter.tsx',
        'src/components/sections/home/YouTubeFacade.tsx',
        'src/content/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        // Server-only glue between the CMS API reads and the pages; exercised by
        // `next build` (against the API or the mock API) and the e2e suite.
        'src/content/registry.ts',
      ],
      thresholds: {
        lines: COVERAGE_THRESHOLD_PERCENT,
        functions: COVERAGE_THRESHOLD_PERCENT,
        branches: COVERAGE_THRESHOLD_PERCENT,
        statements: COVERAGE_THRESHOLD_PERCENT,
      },
    },
  },
});
