/**
 * Content Security Policy for the public site (ADR 0004, nonce update).
 *
 * `proxy.ts` sends one enforced policy per request with a fresh nonce:
 * `script-src 'nonce-…' 'strict-dynamic'`, no `'unsafe-inline'`. Next.js reads the
 * nonce from the request's CSP header while it renders and stamps it on every script
 * it emits (framework chunks and the inline RSC payload); the root layout adds it to
 * the theme script. `'strict-dynamic'` lets those trusted scripts load the rest
 * (Turbopack chunks, Turnstile via `next/script`), so no host or hash list is needed
 * and an injected inline script without the nonce never runs. A nonce only works
 * with per-request rendering, which the root layout opts into by reading it.
 *
 * `'self'` and the Turnstile origin stay in `script-src` only as a fallback for
 * browsers without CSP Level 3 (they ignore `'strict-dynamic'`); browsers that
 * understand `'strict-dynamic'` ignore them. The admin dashboard is the separate
 * `admin/` app with its own nonce CSP (ADR 0014).
 */

export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
/** Privacy-enhanced YouTube player for the click-to-load home testimonials. */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
/** Request header that carries the nonce to Server Components (the root layout). */
export const NONCE_HEADER = 'x-nonce';

export interface CspOptions {
  /** The per-request nonce (base64, from `createNonce`). */
  readonly nonce: string;
  /** Browser-facing API origin added to `connect-src`, e.g. `https://api.agency.com`. */
  readonly apiOrigin: string;
  /** Object storage origin for presigned CV uploads (`connect-src`). */
  readonly uploadOrigin: string;
  /** Public media origin of the CMS image library (`img-src`, ADR 0017). */
  readonly mediaOrigin: string;
  /** Development needs `'unsafe-eval'` (React debugging) and websocket HMR. */
  readonly isDev?: boolean;
}

export type CspDirectives = Readonly<Record<string, readonly string[]>>;

/** 16 random bytes, base64: unguessable and valid in `'nonce-…'`. */
export function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

const NONCE = /^[A-Za-z0-9+/]{16,}={0,2}$/;

/** Normalises a URL to its origin; throws on anything that is not http(s). */
function toOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`CSP origin must be http(s): ${value}`);
  }
  return url.origin;
}

/** Directive map, kept separate from serialisation so tests can assert on it. */
export function buildCspDirectives({
  nonce,
  apiOrigin,
  uploadOrigin,
  mediaOrigin,
  isDev = false,
}: CspOptions): CspDirectives {
  if (!NONCE.test(nonce)) throw new Error('Invalid CSP nonce');
  const api = toOrigin(apiOrigin);
  const upload = toOrigin(uploadOrigin);
  const media = toOrigin(mediaOrigin);
  return {
    'default-src': ["'self'"],
    'script-src': [
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // CSP Level 2 fallback only (ignored next to 'strict-dynamic').
      "'self'",
      TURNSTILE_ORIGIN,
      // Self-hosted Draco / Basis (KTX2) WebAssembly decoders (plan A11).
      "'wasm-unsafe-eval'",
      // guardian-ignore SEC007: `next dev` only (React dev tooling); never in the production policy
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Next.js and Motion set inline style attributes; styles cannot execute script.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', media],
    'font-src': ["'self'"],
    'connect-src': [...new Set(["'self'", api, upload]), ...(isDev ? ['ws:'] : [])],
    'frame-src': [TURNSTILE_ORIGIN, YOUTUBE_EMBED_ORIGIN],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
  };
}

/** Serialises directives as `name value; name value; flag`. */
export function serializeCsp(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(' ')}` : name))
    .join('; ');
}

export function buildCsp(options: CspOptions): string {
  return serializeCsp(buildCspDirectives(options));
}
