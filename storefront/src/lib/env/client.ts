import { z } from 'zod';

/**
 * Public environment (inlined into the browser bundle at build time). Never put a
 * secret in a `NEXT_PUBLIC_` variable (doc §9.5).
 */
export const clientEnvSchema = z.object({
  /** Canonical site origin, e.g. `https://www.agency.com`. Used for metadata and sitemap. */
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/, error: 'Must be an http(s) URL.' }),
  /** Browser-facing API origin (CSP `connect-src`). */
  NEXT_PUBLIC_API_ORIGIN: z.url({ protocol: /^https?$/, error: 'Must be an http(s) URL.' }),
  /**
   * Origin of the object storage that receives presigned CV uploads (MinIO locally,
   * the R2 S3 endpoint in production). Added to CSP `connect-src`; must equal the
   * origin of the `uploadUrl` the API returns.
   */
  NEXT_PUBLIC_UPLOAD_ORIGIN: z.url({ protocol: /^https?$/, error: 'Must be an http(s) URL.' }),
  /**
   * Origin that serves the CMS media library's public images (ADR 0017): local MinIO,
   * the R2 custom domain in production. Allowed in `images.remotePatterns` and in the
   * CSP `img-src`; must equal the origin of the API's `MEDIA_PUBLIC_BASE_URL`.
   */
  NEXT_PUBLIC_MEDIA_ORIGIN: z.url({ protocol: /^https?$/, error: 'Must be an http(s) URL.' }),
  /** Cloudflare Turnstile site key (public by design). */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().trim().min(1, 'Required.'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

type RawClientEnv = Readonly<Record<keyof ClientEnv, string | undefined>>;

/**
 * Local defaults, used only for builds that are not deployments (local and CI).
 * The Turnstile key is Cloudflare's "always passes" test key.
 */
export const LOCAL_CLIENT_ENV_DEFAULTS: ClientEnv = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_API_ORIGIN: 'http://localhost:4000',
  NEXT_PUBLIC_UPLOAD_ORIGIN: 'http://localhost:9000',
  NEXT_PUBLIC_MEDIA_ORIGIN: 'http://localhost:9000',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
};

export interface ParseClientEnvOptions {
  /** When true (Vercel preview/production builds), every variable must be set explicitly. */
  readonly requireExplicit: boolean;
}

/** Treats unset and empty variables alike (CI often exports `VAR=`). */
function orDefault(value: string | undefined, fallback: string): string {
  return value === undefined || value === '' ? fallback : value;
}

/** Validates the public env and throws a readable error listing every problem (fail fast). */
export function parseClientEnv(raw: RawClientEnv, { requireExplicit }: ParseClientEnvOptions) {
  const input = requireExplicit
    ? raw
    : {
        NEXT_PUBLIC_SITE_URL: orDefault(
          raw.NEXT_PUBLIC_SITE_URL,
          LOCAL_CLIENT_ENV_DEFAULTS.NEXT_PUBLIC_SITE_URL,
        ),
        NEXT_PUBLIC_API_ORIGIN: orDefault(
          raw.NEXT_PUBLIC_API_ORIGIN,
          LOCAL_CLIENT_ENV_DEFAULTS.NEXT_PUBLIC_API_ORIGIN,
        ),
        NEXT_PUBLIC_UPLOAD_ORIGIN: orDefault(
          raw.NEXT_PUBLIC_UPLOAD_ORIGIN,
          LOCAL_CLIENT_ENV_DEFAULTS.NEXT_PUBLIC_UPLOAD_ORIGIN,
        ),
        NEXT_PUBLIC_MEDIA_ORIGIN: orDefault(
          raw.NEXT_PUBLIC_MEDIA_ORIGIN,
          LOCAL_CLIENT_ENV_DEFAULTS.NEXT_PUBLIC_MEDIA_ORIGIN,
        ),
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: orDefault(
          raw.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          LOCAL_CLIENT_ENV_DEFAULTS.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        ),
      };
  const result = clientEnvSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid public environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** True for Vercel preview and production builds, where defaults must never apply. */
function isDeploymentBuild(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  return vercelEnv === 'production' || vercelEnv === 'preview';
}

// Next.js inlines only literal `process.env.NEXT_PUBLIC_*` reads, so each variable
// is named explicitly here.
export const clientEnv: ClientEnv = parseClientEnv(
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN,
    NEXT_PUBLIC_UPLOAD_ORIGIN: process.env.NEXT_PUBLIC_UPLOAD_ORIGIN,
    NEXT_PUBLIC_MEDIA_ORIGIN: process.env.NEXT_PUBLIC_MEDIA_ORIGIN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  { requireExplicit: isDeploymentBuild() },
);

/** Canonical site origin as a URL (no trailing slash in `.origin`). */
export const siteUrl = new URL(clientEnv.NEXT_PUBLIC_SITE_URL);
