/**
 * Runs once when a Next.js server instance starts (not for static assets). Validates
 * the server-only environment so a misconfigured deployment fails at boot instead of
 * on the first form submission.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const { getServerEnv } = await import('./lib/env/server');
  getServerEnv();
}
