import { describe, expect, it } from 'vitest';

import { jobApplicationSchema } from './careers.js';
import {
  newsletterConfirmSchema,
  newsletterSubscribeSchema,
  newsletterTokenSchema,
  newsletterUnsubscribeSchema,
} from './newsletter.js';

const application = {
  jobSlug: 'senior-frontend-engineer',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  cvFileId: '0190a6d2-7b4e-7c3a-8f1e-2b3c4d5e6f70',
  turnstileToken: 'turnstile-token',
  consent: true,
} as const;

describe('newsletter schemas', () => {
  it('accepts a subscription and lowercases the email', () => {
    expect(
      newsletterSubscribeSchema.parse({ email: 'News@Example.com', turnstileToken: 't' }).email,
    ).toBe('news@example.com');
  });

  it('requires a Turnstile token and rejects unknown fields', () => {
    expect(newsletterSubscribeSchema.safeParse({ email: 'a@example.com' }).success).toBe(false);
    expect(
      newsletterSubscribeSchema.safeParse({
        email: 'a@example.com',
        turnstileToken: 't',
        list: 'all',
      }).success,
    ).toBe(false);
  });

  it('validates confirm / unsubscribe tokens', () => {
    expect(newsletterTokenSchema.safeParse({ token: 'a'.repeat(43) }).success).toBe(true);
    expect(newsletterTokenSchema.safeParse({ token: 'a'.repeat(42) }).success).toBe(false);
  });

  it.each([
    ['confirm', newsletterConfirmSchema],
    ['unsubscribe', newsletterUnsubscribeSchema],
  ] as const)('validates the %s body', (_name, schema) => {
    const token = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123-_Z';
    expect(schema.parse({ token: ` ${token} ` })).toEqual({ token });
    expect(schema.safeParse({ token: token.slice(1) }).success).toBe(false);
    expect(schema.safeParse({ token: `${token.slice(1)}=` }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ token, email: 'a@example.com' }).success).toBe(false);
  });
});

describe('jobApplicationSchema', () => {
  it('accepts the minimum required fields', () => {
    expect(jobApplicationSchema.safeParse(application).success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = jobApplicationSchema.safeParse({
      ...application,
      phone: '+1 555 123 4567',
      portfolioUrl: 'https://grace.example.com',
      coverLetter: 'I would love to join.',
    });
    expect(result.success).toBe(true);
  });

  it('treats empty optional fields as not provided', () => {
    const result = jobApplicationSchema.safeParse({ ...application, phone: '', portfolioUrl: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-https portfolio URL', () => {
    expect(
      jobApplicationSchema.safeParse({ ...application, portfolioUrl: 'http://grace.example.com' })
        .success,
    ).toBe(false);
  });

  it('rejects an invalid job slug or CV id', () => {
    expect(jobApplicationSchema.safeParse({ ...application, jobSlug: '../admin' }).success).toBe(
      false,
    );
    expect(jobApplicationSchema.safeParse({ ...application, cvFileId: '123' }).success).toBe(false);
  });

  it('limits the cover letter to 5000 characters', () => {
    expect(
      jobApplicationSchema.safeParse({ ...application, coverLetter: 'x'.repeat(5001) }).success,
    ).toBe(false);
  });

  it('requires consent and rejects unknown fields', () => {
    expect(jobApplicationSchema.safeParse({ ...application, consent: false }).success).toBe(false);
    expect(jobApplicationSchema.safeParse({ ...application, status: 'hired' }).success).toBe(false);
  });
});
