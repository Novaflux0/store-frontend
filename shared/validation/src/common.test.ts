import { describe, expect, it } from 'vitest';

import {
  cursorQuerySchema,
  emailSchema,
  httpsUrlSchema,
  nameSchema,
  opaqueTokenSchema,
  optionalField,
  phoneSchema,
  slugSchema,
  turnstileTokenSchema,
  honeypotSchema,
  uuidV7Schema,
} from './common.js';

const UUID_V7 = '0190a6d2-7b4e-7c3a-8f1e-2b3c4d5e6f70';
const UUID_V4 = '550e8400-e29b-41d4-a716-446655440000';
const TOKEN_43 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123-_Z';

describe('emailSchema', () => {
  it('trims and lowercases before validating', () => {
    expect(emailSchema.parse('  Jane.Doe@Example.COM ')).toBe('jane.doe@example.com');
  });

  it.each(['', 'not-an-email', 'a@b', 'a b@example.com'])('rejects %j', (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });

  it('rejects addresses longer than 254 characters', () => {
    const local = 'a'.repeat(64);
    const domain = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
    expect(emailSchema.safeParse(`${local}@${domain}`).success).toBe(false);
  });
});

describe('nameSchema', () => {
  it('trims whitespace', () => {
    expect(nameSchema.parse('  Ada Lovelace  ')).toBe('Ada Lovelace');
  });

  it.each(['', '   ', 'a'.repeat(101), 'line\nbreak'])('rejects %j', (value) => {
    expect(nameSchema.safeParse(value).success).toBe(false);
  });
});

describe('simple string schemas', () => {
  it('requires a Turnstile token', () => {
    expect(turnstileTokenSchema.safeParse('').success).toBe(false);
    expect(turnstileTokenSchema.safeParse('x'.repeat(2049)).success).toBe(false);
    expect(turnstileTokenSchema.parse(' token ')).toBe('token');
  });

  it('accepts only UUID v7', () => {
    expect(uuidV7Schema.safeParse(UUID_V7).success).toBe(true);
    expect(uuidV7Schema.safeParse(UUID_V4).success).toBe(false);
    expect(uuidV7Schema.safeParse('not-a-uuid').success).toBe(false);
  });

  it('accepts only 43-character base64url tokens', () => {
    expect(opaqueTokenSchema.safeParse(TOKEN_43).success).toBe(true);
    expect(opaqueTokenSchema.safeParse(TOKEN_43.slice(1)).success).toBe(false);
    expect(opaqueTokenSchema.safeParse(`${TOKEN_43.slice(1)}=`).success).toBe(false);
    expect(opaqueTokenSchema.safeParse(`${TOKEN_43.slice(1)}+`).success).toBe(false);
  });

  it('accepts kebab-case slugs only', () => {
    expect(slugSchema.safeParse('senior-frontend-engineer').success).toBe(true);
    for (const bad of ['Senior', 'two--hyphens', '-leading', 'trailing-', 'under_score', '']) {
      expect(slugSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('accepts https URLs on real domains only', () => {
    expect(httpsUrlSchema.safeParse('https://portfolio.example.com/work').success).toBe(true);
    for (const bad of [
      'http://example.com',
      'javascript:alert(1)',
      'https://localhost',
      'ftp://example.com',
      'example.com',
    ]) {
      expect(httpsUrlSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('accepts common phone formats', () => {
    for (const ok of ['+44 20 7946 0958', '(555) 123-4567', '0123456789']) {
      expect(phoneSchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ['12', 'call me', '+44 20 7946 0958 ext']) {
      expect(phoneSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('treats an empty string as "not provided" for optional fields', () => {
    const optionalPhone = optionalField(phoneSchema);
    expect(optionalPhone.parse('')).toBe('');
    expect(optionalPhone.parse(undefined)).toBeUndefined();
    expect(optionalPhone.safeParse('nope').success).toBe(false);
  });
});

describe('cursorQuerySchema', () => {
  it('defaults the limit to 20', () => {
    expect(cursorQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('coerces query-string numbers', () => {
    expect(cursorQuerySchema.parse({ limit: '50', cursor: 'abc' })).toEqual({
      limit: 50,
      cursor: 'abc',
    });
  });

  it.each(['0', '101', '1.5', 'ten'])('rejects limit %j', (limit) => {
    expect(cursorQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it('rejects unknown query parameters', () => {
    expect(cursorQuerySchema.safeParse({ limit: '10', offset: '5' }).success).toBe(false);
  });
});

describe('honeypotSchema', () => {
  it('is optional and passes a filled value on to the API, which reports it', () => {
    expect(honeypotSchema.safeParse(undefined).success).toBe(true);
    expect(honeypotSchema.safeParse('').success).toBe(true);
    expect(honeypotSchema.safeParse('https://spam.example').success).toBe(true);
    expect(honeypotSchema.safeParse('x'.repeat(201)).success).toBe(false);
  });
});
