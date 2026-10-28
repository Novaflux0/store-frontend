import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  createRedirectLookup,
  firstReport,
  REDIRECT_MAP_TTL_MS,
  reportSeoEvent,
  signSeoEvent,
} from './redirects';

const map = (redirects: unknown[]) =>
  new Response(JSON.stringify({ redirects }), { headers: { 'Content-Type': 'application/json' } });

describe('createRedirectLookup', () => {
  it('loads the map once, normalises paths and refreshes in the background', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(map([{ source: '/old', target: '/new', statusCode: 301 }]))
      .mockResolvedValueOnce(map([{ source: '/old', target: '/newer', statusCode: 302 }]));
    const lookup = createRedirectLookup({ fetcher, apiBaseUrl: () => 'http://api.test' });
    const now = 1_000_000;
    expect(await lookup.find('/Old/?utm=1', now)).toEqual({
      source: '/old',
      target: '/new',
      statusCode: 301,
    });
    expect(await lookup.find('/other', now)).toBeNull();
    expect(await lookup.find('/', now)).toBeNull();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toBe('http://api.test/api/v1/redirects');

    // Expired: the stale answer is served while the refresh runs.
    expect(await lookup.find('/old', now + REDIRECT_MAP_TTL_MS)).toMatchObject({ target: '/new' });
    await vi.waitFor(async () => {
      expect(await lookup.find('/old', now + REDIRECT_MAP_TTL_MS + 1)).toMatchObject({
        target: '/newer',
      });
    });
  });

  it('serves pages without redirects when the API is down', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('down'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lookup = createRedirectLookup({ fetcher, apiBaseUrl: () => 'http://api.test' });
    expect(await lookup.find('/old', 1)).toBeNull();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe('reportSeoEvent', () => {
  it('signs the event the way the API verifies it', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const secret = 's'.repeat(32);
    await reportSeoEvent(
      { kind: 'not-found', path: '/missing', referrer: 'https://google.com/' },
      { fetcher, apiBaseUrl: () => 'http://api.test', secret: () => secret },
      1234,
    );
    const [url, init] = fetcher.mock.calls[0] as [
      URL,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(String(url)).toBe('http://api.test/api/v1/internal/seo-events');
    const body = init.body as string;
    expect(init.headers['X-Seo-Event-Timestamp']).toBe('1234');
    const expected = createHmac('sha256', secret).update(`seo-event.1234.${body}`).digest('hex');
    expect(init.headers['X-Seo-Event-Signature']).toBe(expected);
    expect(signSeoEvent(secret, '1234', body)).toBe(expected);
  });

  it('does nothing without a secret and never throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('down'));
    await reportSeoEvent(
      { kind: 'redirect-hit', path: '/a' },
      { fetcher, apiBaseUrl: () => 'http://api.test', secret: () => undefined },
    );
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      reportSeoEvent(
        { kind: 'redirect-hit', path: '/a' },
        { fetcher, apiBaseUrl: () => 'http://api.test', secret: () => 'x'.repeat(32) },
      ),
    ).resolves.toBeUndefined();
  });
});

describe('firstReport', () => {
  it('reports a request once', () => {
    expect(firstReport('req-1')).toBe(true);
    expect(firstReport('req-1')).toBe(false);
    expect(firstReport('req-2')).toBe(true);
  });
});
