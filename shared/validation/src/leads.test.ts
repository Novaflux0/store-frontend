import { describe, expect, it } from 'vitest';

import { contactLeadSchema, createLeadSchema, inquiryLeadSchema } from './leads.js';

const contact = {
  kind: 'contact',
  name: 'Ada Lovelace',
  email: 'ADA@Example.com',
  message: 'We would like a new website.',
  turnstileToken: 'turnstile-token',
  consent: true,
} as const;

const inquiry = {
  ...contact,
  kind: 'inquiry',
  company: 'Analytical Engines Ltd',
  service: '3d-experiences',
  budget: '15k-50k',
  timeline: '1-3-months',
} as const;

function issuePaths(result: { error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('contactLeadSchema', () => {
  it('accepts a valid contact lead and normalises it', () => {
    const lead = contactLeadSchema.parse({ ...contact, name: '  Ada Lovelace ' });
    expect(lead.name).toBe('Ada Lovelace');
    expect(lead.email).toBe('ada@example.com');
  });

  it('rejects unknown fields (forbidNonWhitelisted)', () => {
    const result = contactLeadSchema.safeParse({ ...contact, role: 'ADMIN' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
  });

  it('requires consent to be exactly true', () => {
    expect(contactLeadSchema.safeParse({ ...contact, consent: false }).success).toBe(false);
    expect(contactLeadSchema.safeParse({ ...contact, consent: 'true' }).success).toBe(false);
  });

  it('enforces message length (10 to 5000 characters after trimming)', () => {
    expect(contactLeadSchema.safeParse({ ...contact, message: '   short   ' }).success).toBe(false);
    expect(contactLeadSchema.safeParse({ ...contact, message: 'x'.repeat(5001) }).success).toBe(
      false,
    );
    expect(contactLeadSchema.safeParse({ ...contact, message: 'x'.repeat(5000) }).success).toBe(
      true,
    );
  });

  it('makes company optional', () => {
    expect(contactLeadSchema.safeParse(contact).success).toBe(true);
    expect(contactLeadSchema.safeParse({ ...contact, company: 'x'.repeat(201) }).success).toBe(
      false,
    );
  });
});

describe('inquiryLeadSchema', () => {
  it('accepts a valid inquiry', () => {
    expect(inquiryLeadSchema.safeParse(inquiry).success).toBe(true);
  });

  it('requires service, budget and timeline', () => {
    const { service: _service, budget: _budget, timeline: _timeline, ...rest } = inquiry;
    const result = inquiryLeadSchema.safeParse(rest);
    expect(issuePaths(result).sort()).toEqual(['budget', 'service', 'timeline']);
  });

  it('rejects values outside the option lists', () => {
    expect(inquiryLeadSchema.safeParse({ ...inquiry, service: 'hosting' }).success).toBe(false);
    expect(inquiryLeadSchema.safeParse({ ...inquiry, budget: '1m' }).success).toBe(false);
  });
});

describe('createLeadSchema (discriminated union on kind)', () => {
  it('selects the schema from kind', () => {
    expect(createLeadSchema.parse(contact).kind).toBe('contact');
    const parsed = createLeadSchema.parse(inquiry);
    expect(parsed.kind === 'inquiry' && parsed.service).toBe('3d-experiences');
  });

  it('rejects inquiry-only fields on a contact lead', () => {
    expect(createLeadSchema.safeParse({ ...contact, service: 'seo' }).success).toBe(false);
  });

  it('reports missing inquiry fields when kind is inquiry', () => {
    const result = createLeadSchema.safeParse({ ...contact, kind: 'inquiry' });
    expect(issuePaths(result).sort()).toEqual(['budget', 'service', 'timeline']);
  });

  it('rejects an unknown or missing kind', () => {
    expect(createLeadSchema.safeParse({ ...contact, kind: 'spam' }).success).toBe(false);
    const { kind: _kind, ...withoutKind } = contact;
    expect(createLeadSchema.safeParse(withoutKind).success).toBe(false);
  });
});
