import 'server-only';

import { z } from 'zod';

/**
 * API origin without the version prefix, e.g. `http://localhost:4000`.
 * `apiPath()` from `@agency/types` adds `/api/v1`.
 */
const apiBaseUrlSchema = z
  .url({ protocol: /^https?$/, error: 'Must be an http(s) URL.' })
  .refine((value) => {
    // Malformed URLs are already reported by z.url().
    if (!URL.canParse(value)) return true;
    const url = new URL(value);
    return url.pathname === '/' && !url.search && !url.hash;
  }, 'Must be an origin only (no path such as /api/v1; apiPath() adds the prefix).');

/** True for Vercel preview and production builds, where optional secrets become required. */
function isDeployment(env: Readonly<Record<string, string | undefined>>): boolean {
  return env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview';
}

/** Server-only environment. Importing this module from a Client Component fails the build. */
export const serverEnvSchema = z.object({
  API_BASE_URL: apiBaseUrlSchema,
  /** HMAC key for signed client-IP forwarding (ADR 0006). Must equal the API's value. */
  CLIENT_IP_HMAC_SECRET: z.string().min(32, 'Must be at least 32 characters.'),
  /**
   * Sent by a Cloudflare Transform Rule as `x-edge-auth` (ADR 0006). Without it the
   * site never trusts `CF-Connecting-IP`, which visitors could otherwise forge.
   */
  EDGE_AUTH_SECRET: z.string().min(32, 'Must be at least 32 characters.').optional(),
  /**
   * Verifies the API's on-demand revalidation requests (ADR 0014). Must equal the
   * API's `REVALIDATE_HMAC_SECRET`. Optional locally (the endpoint then refuses every
   * request); required on Vercel deployments.
   */
  REVALIDATE_HMAC_SECRET: z.string().min(32, 'Must be at least 32 characters.').optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Validates the server env and throws a readable error listing every problem (fail fast). */
export function parseServerEnv(env: Readonly<Record<string, string | undefined>>): ServerEnv {
  const present = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ''),
  );
  const schema = isDeployment(env)
    ? serverEnvSchema.required({ REVALIDATE_HMAC_SECRET: true })
    : serverEnvSchema;
  const result = schema.safeParse(present);
  if (!result.success) {
    throw new Error(`Invalid server environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/**
 * Parsed server env, validated once per process. Validation is lazy so static
 * pages can be built without runtime secrets; `instrumentation.ts` calls this at
 * server start-up so a misconfigured deployment fails before serving traffic.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

let apiBaseUrl: string | undefined;

/**
 * Only the API origin, for content reads at build time: `next build` needs the API
 * but not the runtime secrets that `getServerEnv()` also requires.
 */
export function getApiBaseUrl(): string {
  if (apiBaseUrl === undefined) {
    const result = apiBaseUrlSchema.safeParse(process.env.API_BASE_URL);
    if (!result.success) {
      throw new Error(`Invalid API_BASE_URL:\n${z.prettifyError(result.error)}`);
    }
    apiBaseUrl = result.data;
  }
  return apiBaseUrl;
}
