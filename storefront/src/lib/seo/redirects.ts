import { createHmac } from 'node:crypto';

import { API_HEADERS, API_ROUTES, apiPath, type RedirectMapResponse } from '@agency/types';
import { normalizeRedirectPath } from '@agency/validation/constants';

/**
 * Redirects managed in the dashboard (301, 302, 410), applied by the proxy before a
 * page renders, and the reports of 404s and redirect hits sent back to the API.
 *
 * Used from `proxy.ts`, so it imports no `server-only` module and reads `process.env`
 * itself. The redirect map is kept in memory per server instance and refreshed every
 * minute in the background (stale while revalidating); when the API is unreachable
 * the site keeps serving pages, it just applies no redirects (fail open).
 */

export type RedirectEntry = RedirectMapResponse['redirects'][number];

/** Set by the proxy: the request path, for the not-found page (it gets no params). */
export const PATHNAME_HEADER = 'x-pathname';
/** Set by the proxy: a random id per request, so a 404 is reported once per request. */
export const REQUEST_ID_HEADER = 'x-seo-request-id';

const REPORTED_CAPACITY = 1000;
const reported = new Set<string>();

/**
 * True the first time a request id is seen. The not-found page can render more than
 * once for one request (an unmatched URL renders the global not-found twice), and
 * each 404 must count once.
 */
export function firstReport(requestId: string): boolean {
  if (reported.has(requestId)) return false;
  if (reported.size >= REPORTED_CAPACITY) {
    const oldest = reported.values().next().value;
    if (oldest !== undefined) reported.delete(oldest);
  }
  reported.add(requestId);
  return true;
}

export const REDIRECT_MAP_TTL_MS = 60_000;
/** After a failed refresh the next attempt comes sooner. */
const RETRY_MS = 10_000;
const FETCH_TIMEOUT_MS = 2000;

export interface RedirectLookupDeps {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: () => string | undefined;
}

const defaultDeps: RedirectLookupDeps = {
  fetcher: (...args) => fetch(...args),
  apiBaseUrl: () => process.env.API_BASE_URL,
};

/** One cached redirect map; `find` answers from memory after the first load. */
export function createRedirectLookup(deps: RedirectLookupDeps = defaultDeps) {
  let map: ReadonlyMap<string, RedirectEntry> | null = null;
  let expiresAt = 0;
  let refreshing: Promise<void> | null = null;

  async function load(now: number): Promise<void> {
    const base = deps.apiBaseUrl();
    if (base === undefined) {
      map = new Map();
      expiresAt = now + REDIRECT_MAP_TTL_MS;
      return;
    }
    try {
      const response = await deps.fetcher(new URL(apiPath(API_ROUTES.redirects), base), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`The API answered ${String(response.status)}`);
      const body = (await response.json()) as Partial<RedirectMapResponse>;
      map = new Map((body.redirects ?? []).map((entry) => [entry.source, entry]));
      expiresAt = now + REDIRECT_MAP_TTL_MS;
    } catch (error) {
      console.error('[redirects] Could not load the redirect map; serving without it.', error);
      map ??= new Map();
      expiresAt = now + RETRY_MS;
    }
  }

  function refresh(now: number): Promise<void> {
    refreshing ??= load(now).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  return {
    /** The redirect for a request path, or null. Waits only for the very first load. */
    async find(pathname: string, now: number = Date.now()): Promise<RedirectEntry | null> {
      const path = normalizeRedirectPath(pathname);
      if (path === null) return null;
      if (map === null) await refresh(now);
      else if (expiresAt <= now) void refresh(now);
      return map?.get(path) ?? null;
    },
  };
}

export const redirectLookup = createRedirectLookup();

// --- Reports to the API -------------------------------------------------------------------

export type SeoEventReport =
  | { readonly kind: 'not-found'; readonly path: string; readonly referrer?: string }
  | { readonly kind: 'redirect-hit'; readonly path: string };

/** Must match the API's `signSeoEvent` (backend/src/modules/seo/seo-event-signature.ts). */
export function signSeoEvent(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret)
    .update(`seo-event.${timestamp}.${body}`, 'utf8')
    .digest('hex');
}

/**
 * Tells the API about a 404 or a redirect hit, signed with the shared revalidation
 * secret. Fire and forget: never throws, and does nothing without the secret (local).
 */
export async function reportSeoEvent(
  event: SeoEventReport,
  deps: RedirectLookupDeps & { readonly secret: () => string | undefined } = {
    ...defaultDeps,
    secret: () => process.env.REVALIDATE_HMAC_SECRET,
  },
  now: number = Date.now(),
): Promise<void> {
  const secret = deps.secret();
  const base = deps.apiBaseUrl();
  if (secret === undefined || secret === '' || base === undefined) return;
  const body = JSON.stringify(event);
  const timestamp = String(now);
  try {
    await deps.fetcher(new URL(apiPath(API_ROUTES.seoEvents), base), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [API_HEADERS.seoEventTimestamp]: timestamp,
        [API_HEADERS.seoEventSignature]: signSeoEvent(secret, timestamp, body),
      },
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    // Reporting is best effort; the visitor's response never depends on it.
  }
}

/** The page sent for a 410: the content was removed on purpose and will not return. */
export function goneHtml(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page removed</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#05060a;color:#e8eaf0}main{max-width:36rem;padding:2rem}a{color:#4ff0ff}</style></head><body><main><p>410</p><h1>This page has been removed</h1><p>The content that was here is no longer available.</p><p><a href="/">Go to the home page</a></p></main></body></html>`;
}
