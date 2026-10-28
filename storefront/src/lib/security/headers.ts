export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

/**
 * Security headers from doc §9.5, applied to every route by `next.config.ts`.
 * The Content Security Policy is not here: `proxy.ts` sets it per request with a
 * fresh nonce (ADR 0004, `src/lib/security/csp.ts`).
 */
export function buildSecurityHeaders(): SecurityHeader[] {
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}
