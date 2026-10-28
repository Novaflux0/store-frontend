// `pnpm build`: `next build` (the CSP uses a per-request nonce, ADR 0004).
//
// The pages read their content from the CMS API at build time (ADR 0014):
//  - API_BASE_URL set: builds against that API. An unreachable API fails the build.
//  - Vercel preview/production without API_BASE_URL: fails (never ship fixtures).
//  - Otherwise (local, CI): starts the e2e mock API (`e2e/mock-api.ts`, the backend
//    seed content) for the duration of the build and says so loudly.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const MOCK_PORT = 4998;

const isDeployment = ['production', 'preview'].includes(process.env.VERCEL_ENV ?? '');

function run(args, env) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function waitForHealth(origin) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/v1/health/live`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await sleep(100);
  }
  throw new Error(`The mock content API did not start on ${origin}.`);
}

let mock;
const env = { ...process.env };
if (!env.API_BASE_URL) {
  if (isDeployment) {
    console.error(
      'API_BASE_URL is required for Vercel builds: the pages read their content from the API.',
    );
    process.exit(1);
  }
  const origin = `http://127.0.0.1:${String(MOCK_PORT)}`;
  console.warn(
    `\n[build] API_BASE_URL is not set: building with the mock content API (${origin}),\n` +
      '[build] i.e. the backend seed content. Set API_BASE_URL to build against a real API.\n',
  );
  mock = spawn(process.execPath, ['e2e/mock-api.ts'], {
    stdio: 'inherit',
    env: { ...process.env, MOCK_API_PORT: String(MOCK_PORT) },
  });
  env.API_BASE_URL = origin;
  await waitForHealth(origin);
}

try {
  run([nextBin, 'build'], env);
} finally {
  mock?.kill();
}
