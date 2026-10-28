import { describe, expect, it } from 'vitest';

import {
  applicationsQuerySchema,
  auditQuerySchema,
  idParamSchema,
  leadNoteSchema,
  leadsQuerySchema,
  staffQuerySchema,
  subscribersQuerySchema,
  unbanAddressSchema,
  updateApplicationSchema,
  updateLeadSchema,
} from './admin.js';
import {
  createMediaSchema,
  mediaQuerySchema,
  mediaUploadRequestSchema,
  updateMediaSchema,
} from './media.js';

const ID = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

describe('admin list queries', () => {
  it('coerces the limit and accepts filters', () => {
    expect(leadsQuerySchema.parse({ limit: '50', status: 'new', kind: 'inquiry' })).toEqual({
      limit: 50,
      status: 'new',
      kind: 'inquiry',
    });
    expect(subscribersQuerySchema.parse({ status: 'confirmed' }).status).toBe('confirmed');
    expect(applicationsQuerySchema.parse({ jobSlug: 'designer' }).jobSlug).toBe('designer');
    expect(staffQuerySchema.parse({ status: 'disabled' }).status).toBe('disabled');
    expect(mediaQuerySchema.parse({ q: 'logo' }).q).toBe('logo');
  });

  it('rejects unknown filters and reversed date ranges', () => {
    expect(leadsQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
    expect(leadsQuerySchema.safeParse({ sort: 'email' }).success).toBe(false);
    expect(
      auditQuerySchema.safeParse({ from: '2026-10-02T00:00:00Z', to: '2026-10-01T00:00:00Z' })
        .success,
    ).toBe(false);
    expect(
      applicationsQuerySchema.safeParse({
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-02T00:00:00Z',
      }).success,
    ).toBe(true);
    expect(auditQuerySchema.safeParse({ actorId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('admin updates', () => {
  it('updates a lead status or assignee, and unassigns with null', () => {
    expect(updateLeadSchema.safeParse({}).success).toBe(false);
    expect(updateLeadSchema.parse({ assigneeId: null })).toEqual({ assigneeId: null });
    expect(updateLeadSchema.safeParse({ status: 'won', assigneeId: ID }).success).toBe(true);
  });

  it('requires non-empty notes', () => {
    expect(leadNoteSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(leadNoteSchema.parse({ body: ' Called back ' })).toEqual({ body: 'Called back' });
  });

  it('validates application status and id params', () => {
    expect(updateApplicationSchema.safeParse({ status: 'hired' }).success).toBe(true);
    expect(updateApplicationSchema.safeParse({ status: 'ghosted' }).success).toBe(false);
    expect(idParamSchema.safeParse({ id: ID }).success).toBe(true);
    expect(idParamSchema.safeParse({ id: '1' }).success).toBe(false);
  });
});

describe('media', () => {
  it('accepts raster images up to 15 MB', () => {
    expect(
      mediaUploadRequestSchema.safeParse({
        fileName: 'hero.avif',
        mimeType: 'IMAGE/AVIF',
        sizeBytes: 1000,
      }).success,
    ).toBe(true);
    expect(
      mediaUploadRequestSchema.safeParse({
        fileName: 'logo.svg',
        mimeType: 'image/svg+xml',
        sizeBytes: 1000,
      }).success,
    ).toBe(false);
    expect(
      mediaUploadRequestSchema.safeParse({
        fileName: 'big.png',
        mimeType: 'image/png',
        sizeBytes: 16 * 1024 * 1024,
      }).success,
    ).toBe(false);
  });

  it('requires alt text', () => {
    expect(createMediaSchema.safeParse({ fileId: ID, alt: '' }).success).toBe(false);
    expect(updateMediaSchema.parse({ alt: ' Team photo ' })).toEqual({ alt: 'Team photo' });
  });
});

describe('unbanAddressSchema', () => {
  it.each(['203.0.113.7', ' 198.51.100.255 ', '2001:0db8:abcd:0012::/64'])(
    'accepts the audit log key %j',
    (ipKey) => {
      expect(unbanAddressSchema.safeParse({ ipKey }).success).toBe(true);
    },
  );

  it.each(['256.1.1.1', '2001:db8::1', '2001:0db8:abcd:0012::/48', 'example.com', ''])(
    'rejects %j',
    (ipKey) => {
      expect(unbanAddressSchema.safeParse({ ipKey }).success).toBe(false);
    },
  );
});
