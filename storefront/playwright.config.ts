import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const MOCK_API_PORT = 4999;
const BASE_URL = `http://localhost:${PORT.toString()}`;
const isCI = Boolean(process.env.CI);

/**
 * Smoke, content, CSP and accessibility tests against the production build
 * (`next start`). Build first: `pnpm build && pnpm test:e2e`. No API or Docker is
 * needed: Server Actions talk to `e2e/mock-api.ts`, and the tests stub Turnstile and
 * the object store in the browser.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // Contract-level API stand-in for Server Actions (no NestJS, no Docker).
      command: `node e2e/mock-api.ts`,
      url: `http://127.0.0.1:${MOCK_API_PORT.toString()}/api/v1/health/live`,
      reuseExistingServer: !isCI,
      timeout: 30_000,
      env: { MOCK_API_PORT: MOCK_API_PORT.toString() },
    },
    {
      command: `pnpm exec next start --port ${PORT.toString()}`,
      url: BASE_URL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: {
        // Server-only env validated at start-up (src/instrumentation.ts). Test values only.
        API_BASE_URL: `http://127.0.0.1:${MOCK_API_PORT.toString()}`,
        CLIENT_IP_HMAC_SECRET: 'e2e-only-client-ip-secret-0123456789abcdef',
      },
    },
  ],
});
