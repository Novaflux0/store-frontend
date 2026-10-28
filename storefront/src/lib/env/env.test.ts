import { afterEach, describe, expect, it, vi } from 'vitest';

import { LOCAL_CLIENT_ENV_DEFAULTS, parseClientEnv } from './client';
import { parseServerEnv } from './server';

const VALID_SERVER = {
  API_BASE_URL: 'http://localhost:4000',
  CLIENT_IP_HMAC_SECRET: 'x'.repeat(32),
};

describe('parseServerEnv', () => {
  it('accepts a valid environment', () => {
    expect(parseServerEnv(VALID_SERVER)).toEqual(VALID_SERVER);
  });

  it('accepts a trailing slash on the origin', () => {
    expect(parseServerEnv({ ...VALID_SERVER, API_BASE_URL: 'https://api.agency.com/' })).toEqual({
      ...VALID_SERVER,
      API_BASE_URL: 'https://api.agency.com/',
    });
  });

  it('rejects an API_BASE_URL with a path (apiPath() adds /api/v1)', () => {
    expect(() =>
      parseServerEnv({ ...VALID_SERVER, API_BASE_URL: 'http://localhost:4000/api/v1' }),
    ).toThrow(/origin only/);
  });

  it('rejects a short HMAC secret and missing values, listing every problem', () => {
    expect(() => parseServerEnv({ CLIENT_IP_HMAC_SECRET: 'short' })).toThrow(
      /API_BASE_URL[\s\S]*CLIENT_IP_HMAC_SECRET|CLIENT_IP_HMAC_SECRET[\s\S]*API_BASE_URL/,
    );
  });

  it('rejects non-http protocols', () => {
    expect(() => parseServerEnv({ ...VALID_SERVER, API_BASE_URL: 'ftp://example.com' })).toThrow(
      /http\(s\)/,
    );
  });

  it('treats empty values as unset and keeps the revalidation secret optional locally', () => {
    expect(parseServerEnv({ ...VALID_SERVER, REVALIDATE_HMAC_SECRET: '' })).toEqual(VALID_SERVER);
    expect(() => parseServerEnv({ ...VALID_SERVER, REVALIDATE_HMAC_SECRET: 'short' })).toThrow(
      /REVALIDATE_HMAC_SECRET/,
    );
  });

  it('requires the revalidation secret on Vercel deployments', () => {
    expect(() => parseServerEnv({ ...VALID_SERVER, VERCEL_ENV: 'production' })).toThrow(
      /REVALIDATE_HMAC_SECRET/,
    );
    expect(
      parseServerEnv({
        ...VALID_SERVER,
        VERCEL_ENV: 'preview',
        REVALIDATE_HMAC_SECRET: 'r'.repeat(32),
      }).REVALIDATE_HMAC_SECRET,
    ).toBe('r'.repeat(32));
  });
});

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('validates only API_BASE_URL (content reads at build time need no secrets)', async () => {
    vi.stubEnv('API_BASE_URL', 'http://localhost:4000');
    vi.stubEnv('CLIENT_IP_HMAC_SECRET', '');
    const { getApiBaseUrl } = await import('./server');
    expect(getApiBaseUrl()).toBe('http://localhost:4000');
  });

  it('throws a readable error for a missing or invalid value', async () => {
    vi.stubEnv('API_BASE_URL', 'http://localhost:4000/api/v1');
    const { getApiBaseUrl } = await import('./server');
    expect(() => getApiBaseUrl()).toThrow(/Invalid API_BASE_URL/);
  });
});

describe('getServerEnv', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('validates process.env once and caches the result', async () => {
    vi.stubEnv('API_BASE_URL', VALID_SERVER.API_BASE_URL);
    vi.stubEnv('CLIENT_IP_HMAC_SECRET', VALID_SERVER.CLIENT_IP_HMAC_SECRET);
    const { getServerEnv } = await import('./server');
    const first = getServerEnv();
    expect(first.API_BASE_URL).toBe(VALID_SERVER.API_BASE_URL);
    expect(getServerEnv()).toBe(first);
  });

  it('throws when the environment is invalid', async () => {
    vi.stubEnv('API_BASE_URL', '');
    const { getServerEnv } = await import('./server');
    expect(() => getServerEnv()).toThrow(/Invalid server environment/);
  });
});

describe('parseClientEnv', () => {
  const empty = {
    NEXT_PUBLIC_SITE_URL: undefined,
    NEXT_PUBLIC_API_ORIGIN: undefined,
    NEXT_PUBLIC_UPLOAD_ORIGIN: undefined,
    NEXT_PUBLIC_MEDIA_ORIGIN: undefined,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined,
  };

  it('uses local defaults outside deployments', () => {
    expect(parseClientEnv(empty, { requireExplicit: false })).toEqual(LOCAL_CLIENT_ENV_DEFAULTS);
  });

  it('requires every variable in deployment builds (fail fast)', () => {
    expect(() => parseClientEnv(empty, { requireExplicit: true })).toThrow(
      /Invalid public environment/,
    );
  });

  it('accepts explicit values', () => {
    const explicit = {
      NEXT_PUBLIC_SITE_URL: 'https://www.agency.com',
      NEXT_PUBLIC_API_ORIGIN: 'https://api.agency.com',
      NEXT_PUBLIC_UPLOAD_ORIGIN: 'https://account.r2.cloudflarestorage.com',
      NEXT_PUBLIC_MEDIA_ORIGIN: 'https://media.agency.com',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA',
    };
    expect(parseClientEnv(explicit, { requireExplicit: true })).toEqual(explicit);
  });

  it('defaults the upload and media origins to local MinIO', () => {
    const env = parseClientEnv(empty, { requireExplicit: false });
    expect(env.NEXT_PUBLIC_UPLOAD_ORIGIN).toBe('http://localhost:9000');
    expect(env.NEXT_PUBLIC_MEDIA_ORIGIN).toBe('http://localhost:9000');
  });

  it('requires the upload origin in deployment builds', () => {
    expect(() =>
      parseClientEnv(
        {
          NEXT_PUBLIC_SITE_URL: 'https://www.agency.com',
          NEXT_PUBLIC_API_ORIGIN: 'https://api.agency.com',
          NEXT_PUBLIC_UPLOAD_ORIGIN: undefined,
          NEXT_PUBLIC_MEDIA_ORIGIN: 'https://media.agency.com',
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA',
        },
        { requireExplicit: true },
      ),
    ).toThrow(/NEXT_PUBLIC_UPLOAD_ORIGIN/);
  });

  it('rejects malformed URLs', () => {
    expect(() =>
      parseClientEnv({ ...empty, NEXT_PUBLIC_SITE_URL: 'not a url' }, { requireExplicit: false }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it('applies no defaults on Vercel deployments', async () => {
    vi.resetModules();
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    await expect(import('./client')).rejects.toThrow(/Invalid public environment/);
  });
});
