import { describe, expect, it } from 'vitest';

import {
  CLIENT_IP_SIGNATURE_MAX_AGE_MS,
  FEATURE_FLAGS,
  HIBP_TIMEOUT_MS,
  IDEMPOTENCY_KEY_TTL_SECONDS,
  JSON_BODY_LIMIT,
  RATE_LIMITS,
  REQUEST_TIMEOUT_MS,
  TOKEN_TTL,
  UPLOAD_LIMITS,
  featureFlagEnvKey,
  getFeatureFlags,
  isFeatureEnabled,
} from './index.js';

describe('RATE_LIMITS (doc §9.10)', () => {
  it('matches the documented limits', () => {
    expect(RATE_LIMITS).toEqual({
      global: { limit: 100, ttlMs: 60_000 },
      login: { limit: 5, ttlMs: 900_000 },
      passwordReset: { limit: 3, ttlMs: 3_600_000 },
      forms: { limit: 3, ttlMs: 600_000 },
      uploadUrl: { limit: 30, ttlMs: 3_600_000 },
    });
  });
});

describe('security constants', () => {
  it('uses the documented token lifetimes', () => {
    expect(TOKEN_TTL).toEqual({
      accessSeconds: 900,
      refreshSeconds: 604_800,
      refreshRememberMeSeconds: 2_592_000,
      signedUrlSeconds: 300,
    });
  });

  it('uses the documented request limits', () => {
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
    expect(JSON_BODY_LIMIT).toBe('100kb');
    expect(IDEMPOTENCY_KEY_TTL_SECONDS).toBe(86_400);
    expect(HIBP_TIMEOUT_MS).toBe(2_000);
    expect(CLIENT_IP_SIGNATURE_MAX_AGE_MS).toBe(60_000);
  });

  it('caps uploads at 10 MiB for CVs, 100 MiB for project files and 15 MiB for media', () => {
    expect(UPLOAD_LIMITS.cv.maxBytes).toBe(10_485_760);
    expect(UPLOAD_LIMITS.project.maxBytes).toBe(104_857_600);
    expect(UPLOAD_LIMITS.media.maxBytes).toBe(15_728_640);
  });
});

describe('feature flags', () => {
  it('maps flag names to FEATURE_<UPPER_SNAKE> env keys', () => {
    expect(featureFlagEnvKey('clientPortal')).toBe('FEATURE_CLIENT_PORTAL');
    expect(featureFlagEnvKey('passkeys')).toBe('FEATURE_PASSKEYS');
  });

  it('defaults every flag to off', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(isFeatureEnabled(flag, {})).toBe(false);
    }
  });

  it.each(['true', 'TRUE', ' 1 ', 'on', 'yes'])('treats %j as enabled', (value) => {
    expect(isFeatureEnabled('clientPortal', { FEATURE_CLIENT_PORTAL: value })).toBe(true);
  });

  it.each(['false', '0', 'off', 'no'])('treats %j as disabled', (value) => {
    expect(isFeatureEnabled('clientPortal', { FEATURE_CLIENT_PORTAL: value })).toBe(false);
  });

  it('falls back to the default for unrecognised values', () => {
    expect(isFeatureEnabled('passkeys', { FEATURE_PASSKEYS: 'enabled' })).toBe(false);
    expect(isFeatureEnabled('passkeys', { FEATURE_PASSKEYS: '' })).toBe(false);
  });

  it('resolves all flags at once', () => {
    expect(getFeatureFlags({ FEATURE_PASSKEYS: 'true' })).toEqual({
      clientPortal: false,
      passkeys: true,
    });
  });
});
