import { describe, expect, it } from 'vitest';

import {
  TURNSTILE_ORIGIN,
  YOUTUBE_EMBED_ORIGIN,
  buildCsp,
  buildCspDirectives,
  createNonce,
  serializeCsp,
} from './csp';
import { buildSecurityHeaders } from './headers';

const NONCE = 'AAECAwQFBgcICQoLDA0ODw==';
const OPTIONS = {
  nonce: NONCE,
  apiOrigin: 'https://api.agency.com',
  uploadOrigin: 'https://account.r2.cloudflarestorage.com',
  mediaOrigin: 'https://media.agency.com',
} as const;

describe('buildCsp', () => {
  it('produces the exact production policy: a nonce, strict-dynamic, no inline scripts', () => {
    expect(buildCsp(OPTIONS)).toBe(
      [
        "default-src 'self'",
        `script-src 'nonce-${NONCE}' 'strict-dynamic' 'self' ${TURNSTILE_ORIGIN} 'wasm-unsafe-eval'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://media.agency.com",
        "font-src 'self'",
        "connect-src 'self' https://api.agency.com https://account.r2.cloudflarestorage.com",
        `frame-src ${TURNSTILE_ORIGIN} ${YOUTUBE_EMBED_ORIGIN}`,
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
      ].join('; '),
    );
  });

  it('never allows inline scripts or eval in production', () => {
    const scriptSrc = buildCspDirectives(OPTIONS)['script-src'];
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('normalises origins, drops paths and de-duplicates connect-src', () => {
    const directives = buildCspDirectives({
      ...OPTIONS,
      apiOrigin: 'https://api.agency.com/api/v1/',
      uploadOrigin: 'https://api.agency.com/bucket',
      mediaOrigin: 'https://media.agency.com/media/',
    });
    expect(directives['connect-src']).toEqual(["'self'", 'https://api.agency.com']);
    expect(directives['img-src']).toContain('https://media.agency.com');
  });

  it("adds 'unsafe-eval' and websockets only in development, without upgrade-insecure-requests", () => {
    const dev = buildCspDirectives({ ...OPTIONS, isDev: true });
    expect(dev['script-src']).toContain("'unsafe-eval'");
    expect(dev['connect-src']).toContain('ws:');
    expect(dev['upgrade-insecure-requests']).toBeUndefined();
  });

  it('rejects a malformed nonce and non-http(s) origins', () => {
    expect(() => buildCsp({ ...OPTIONS, nonce: "x' 'unsafe-inline" })).toThrow(/nonce/);
    expect(() => buildCsp({ ...OPTIONS, apiOrigin: 'javascript:alert(1)' })).toThrow(/http\(s\)/);
    expect(() => buildCsp({ ...OPTIONS, uploadOrigin: 'ftp://files' })).toThrow(/http\(s\)/);
    expect(() => buildCsp({ ...OPTIONS, mediaOrigin: 'data:x' })).toThrow(/http\(s\)/);
  });

  it('serialises value-less directives as bare names', () => {
    expect(serializeCsp({ 'a-src': ["'self'"], flag: [] })).toBe("a-src 'self'; flag");
  });
});

describe('createNonce', () => {
  it('makes a fresh, valid nonce for every request', () => {
    const first = createNonce();
    const second = createNonce();
    expect(first).not.toBe(second);
    expect(() => buildCsp({ ...OPTIONS, nonce: first })).not.toThrow();
    expect(atob(first)).toHaveLength(16);
  });
});

describe('buildSecurityHeaders', () => {
  const headers = Object.fromEntries(buildSecurityHeaders().map((h) => [h.key, h.value]));

  it('leaves the CSP to proxy.ts (per-request nonce)', () => {
    expect(headers['Content-Security-Policy']).toBeUndefined();
    expect(headers['Content-Security-Policy-Report-Only']).toBeUndefined();
  });

  it('enforces every other doc §9.5 header', () => {
    expect(headers).toEqual({
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
    });
  });
});
