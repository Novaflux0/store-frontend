import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

import { API_HEADERS } from '@agency/types';

/** Minimal read-only view of request headers (`Headers` and Next's `headers()` both fit). */
export interface HeaderReader {
  get(name: string): string | null;
}

/** Header a Cloudflare Transform Rule adds with `EDGE_AUTH_SECRET` (ADR 0006). */
export const EDGE_AUTH_HEADER = 'x-edge-auth';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** True only when the request carries the edge secret, i.e. it really came through Cloudflare. */
export function isFromEdge(headers: HeaderReader, edgeSecret: string | undefined): boolean {
  const given = headers.get(EDGE_AUTH_HEADER);
  if (edgeSecret === undefined || edgeSecret === '' || given === null) return false;
  return timingSafeEqual(digest(given), digest(edgeSecret));
}

/**
 * Visitor IP: `CF-Connecting-IP` only when `isFromEdge` proves Cloudflare set it (on
 * the origin's own URL any client can send that header), then the platform's
 * `X-Real-IP`, then the first entry of `X-Forwarded-For`. Returns `null` unless the
 * value is a syntactically valid IPv4/IPv6 address.
 */
export function getClientIp(headers: HeaderReader, edgeSecret?: string): string | null {
  const candidates = [
    isFromEdge(headers, edgeSecret) ? headers.get('cf-connecting-ip') : null,
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
  ];
  for (const candidate of candidates) {
    const ip = candidate?.trim();
    if (ip && isIP(ip) !== 0) return ip;
  }
  return null;
}

/**
 * ADR 0006 canonical signature: lowercase hex HMAC-SHA256 of `${ip}.${timestamp}`.
 * The backend verifies the identical string with a constant-time comparison.
 */
export function signClientIp(ip: string, timestamp: string, secret: string): string {
  return createHmac('sha256', secret).update(`${ip}.${timestamp}`).digest('hex');
}

/**
 * Headers that forward the visitor IP to the API, or `{}` when no valid IP is known
 * (the API then falls back to `req.ip`, the address of the proxy hop in front of it).
 */
export function clientIpHeaders(
  ip: string | null,
  secret: string,
  now: () => number = Date.now,
): Record<string, string> {
  if (!ip || isIP(ip) === 0) return {};
  const timestamp = now().toString();
  return {
    [API_HEADERS.clientIp]: ip,
    [API_HEADERS.clientIpTimestamp]: timestamp,
    [API_HEADERS.clientIpSignature]: signClientIp(ip, timestamp, secret),
  };
}
