import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { API_HEADERS } from '@agency/types';

import { clientIpHeaders, getClientIp, signClientIp } from './client-ip';

// Shared ADR 0006 test vectors: the backend must verify these exact values.
const SECRET = 'test-only-client-ip-secret-0123456789abcdef';
const TIMESTAMP = '1767225600000';
const VECTORS = [
  {
    ip: '203.0.113.7',
    signature: '907f24837803b19cdbee5a1b716497f8af334f09d7c15d6b20c81bbb2ad30d35',
  },
  {
    ip: '2001:db8::1',
    signature: '12e46ed0c8bae6d88a2f79c523b1ab15c15e648196fe5d488f6e76ebcf123218',
  },
] as const;

function headersOf(values: Record<string, string>) {
  return new Headers(values);
}

describe('signClientIp', () => {
  it.each(VECTORS)('matches the shared vector for $ip', ({ ip, signature }) => {
    expect(signClientIp(ip, TIMESTAMP, SECRET)).toBe(signature);
  });

  it('matches the backend test vector (cross-app contract)', () => {
    expect(
      signClientIp('203.0.113.7', '1767225600000', 'test-client-ip-hmac-secret-0123456789abcdef'),
    ).toBe('423961b841d5a1b286b26715878b00b0019553199720a101a4b8028d179eb039');
  });

  it('is lowercase hex HMAC-SHA256 of `${ip}.${timestamp}`', () => {
    const expected = createHmac('sha256', SECRET).update(`198.51.100.1.${TIMESTAMP}`).digest('hex');
    expect(signClientIp('198.51.100.1', TIMESTAMP, SECRET)).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('clientIpHeaders', () => {
  it('sends ip, millisecond timestamp and signature', () => {
    const headers = clientIpHeaders('203.0.113.7', SECRET, () => Number(TIMESTAMP));
    expect(headers).toEqual({
      [API_HEADERS.clientIp]: '203.0.113.7',
      [API_HEADERS.clientIpTimestamp]: TIMESTAMP,
      [API_HEADERS.clientIpSignature]: VECTORS[0].signature,
    });
  });

  it('defaults to the current time', () => {
    const before = Date.now();
    const headers = clientIpHeaders('203.0.113.7', SECRET);
    const timestamp = Number(headers[API_HEADERS.clientIpTimestamp]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('sends nothing without a valid IP', () => {
    expect(clientIpHeaders(null, SECRET)).toEqual({});
    expect(clientIpHeaders('not-an-ip', SECRET)).toEqual({});
  });
});

describe('getClientIp', () => {
  const EDGE = 'edge-secret-from-cloudflare-0123456789abcdef';
  const viaCloudflare = {
    'cf-connecting-ip': '203.0.113.7',
    'x-real-ip': '198.51.100.2',
    'x-forwarded-for': '192.0.2.1',
  };

  it('trusts CF-Connecting-IP only with the edge secret', () => {
    expect(getClientIp(headersOf({ ...viaCloudflare, 'x-edge-auth': EDGE }), EDGE)).toBe(
      '203.0.113.7',
    );
  });

  it('ignores a forged CF-Connecting-IP (no or wrong edge secret)', () => {
    expect(getClientIp(headersOf(viaCloudflare), EDGE)).toBe('198.51.100.2');
    expect(getClientIp(headersOf({ ...viaCloudflare, 'x-edge-auth': 'guess' }), EDGE)).toBe(
      '198.51.100.2',
    );
    expect(getClientIp(headersOf({ ...viaCloudflare, 'x-edge-auth': EDGE }))).toBe('198.51.100.2');
  });

  it('falls back to X-Real-IP, then the first X-Forwarded-For entry', () => {
    expect(getClientIp(headersOf({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(getClientIp(headersOf({ 'x-forwarded-for': ' 192.0.2.1 , 10.0.0.1' }))).toBe(
      '192.0.2.1',
    );
  });

  it('skips invalid values and returns null when nothing is valid', () => {
    expect(
      getClientIp(headersOf({ 'cf-connecting-ip': 'garbage', 'x-real-ip': '2001:db8::1' }), 'x'),
    ).toBe('2001:db8::1');
    expect(getClientIp(headersOf({ 'x-forwarded-for': 'unknown' }))).toBeNull();
    expect(getClientIp(headersOf({}))).toBeNull();
  });
});
