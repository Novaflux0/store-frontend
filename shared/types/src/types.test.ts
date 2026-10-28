import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  API_HEADERS,
  API_PREFIX,
  API_ROUTES,
  CACHE_TAGS,
  PROBLEM_TYPES,
  ROLES,
  apiPath,
  fillRoute,
  isStaffRole,
  type ApiRoute,
  type CursorPage,
  type JobApplicationResponse,
  type NewsletterConfirmResponse,
  type NewsletterSubscribeResponse,
  type NewsletterUnsubscribeResponse,
  type ProblemDetails,
  type ProblemType,
  type UploadUrlResponse,
} from './index.js';

describe('API routes', () => {
  it('uses the versioned prefix', () => {
    expect(API_PREFIX).toBe('/api/v1');
    expect(apiPath(API_ROUTES.leads)).toBe('/api/v1/leads');
    expect(apiPath(API_ROUTES.health.ready)).toBe('/api/v1/health/ready');
  });

  it('uses kebab-case, plural resource paths (doc §13.2)', () => {
    const paths: ApiRoute[] = [
      API_ROUTES.health.live,
      API_ROUTES.health.ready,
      API_ROUTES.leads,
      API_ROUTES.newsletter.subscribe,
      API_ROUTES.newsletter.confirm,
      API_ROUTES.newsletter.unsubscribe,
      API_ROUTES.careers.applications,
      API_ROUTES.files.uploadUrl,
    ];
    for (const path of paths) {
      const [leading, ...segments] = path.split('/');
      expect(leading).toBe('');
      for (const segment of segments) {
        expect(segment).toMatch(/^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]+$/);
      }
    }
  });

  it('covers the Iteration 2 endpoints', () => {
    expect(apiPath(API_ROUTES.newsletter.subscribe)).toBe('/api/v1/newsletter/subscribe');
    expect(apiPath(API_ROUTES.newsletter.confirm)).toBe('/api/v1/newsletter/confirm');
    expect(apiPath(API_ROUTES.newsletter.unsubscribe)).toBe('/api/v1/newsletter/unsubscribe');
    expect(apiPath(API_ROUTES.files.uploadUrl)).toBe('/api/v1/files/upload-url');
    expect(apiPath(API_ROUTES.careers.applications)).toBe('/api/v1/careers/applications');
  });

  it('uses kebab-case segments or :params in the admin, auth and content routes', () => {
    const groups = [API_ROUTES.auth, API_ROUTES.admin, API_ROUTES.content, API_ROUTES.settings];
    for (const path of groups.flatMap((group) => Object.values(group))) {
      const [leading, ...segments] = path.split('/');
      expect(leading).toBe('');
      for (const segment of segments) {
        expect(segment).toMatch(/^(?::[a-z][A-Za-z]*|(?!-)(?!.*--)(?!.*-$)[a-z0-9-]+)$/);
      }
    }
  });

  it('fills route parameters with encoded values', () => {
    expect(fillRoute(API_ROUTES.admin.contentEntry, { type: 'blog-post', id: 'a/b' })).toBe(
      '/admin/content/blog-post/a%2Fb',
    );
    expect(fillRoute(API_ROUTES.admin.contentRestore, { type: 'job', id: 'x', version: 3 })).toBe(
      '/admin/content/job/x/revisions/3/restore',
    );
    expect(fillRoute(API_ROUTES.admin.me, {})).toBe('/admin/me');
    expect(() => fillRoute(API_ROUTES.admin.lead, { id: '' })).toThrow(
      'Missing route parameter "id"',
    );
    // Dot segments would be resolved by URL parsing and reach a parent route.
    expect(() => fillRoute(API_ROUTES.admin.lead, { id: '..' })).toThrow(
      'Invalid route parameter "id"',
    );
    expect(() => fillRoute(API_ROUTES.admin.lead, { id: '.' })).toThrow(
      'Invalid route parameter "id"',
    );
  });

  it('exposes the shared header names', () => {
    expect(API_HEADERS.idempotencyKey).toBe('Idempotency-Key');
    expect(API_HEADERS.clientIp).toBe('X-Client-IP');
  });
});

describe('PROBLEM_TYPES', () => {
  const slugs: string[] = Object.values(PROBLEM_TYPES);

  it('uses unique kebab-case slugs', () => {
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]+$/);
    }
  });

  it('includes the slugs the API and Iteration 2 rely on', () => {
    expect(slugs).toEqual(
      expect.arrayContaining([
        'invalid-or-expired-token',
        'upload-not-found',
        'upload-already-used',
        'invalid-credentials',
        'step-up-required',
        'version-conflict',
        'feature-disabled',
        'verification-failed',
        'validation-error',
        'rate-limited',
        'service-unavailable',
        'not-found',
        'unauthorized',
        'forbidden',
        'conflict',
        'payload-too-large',
        'internal-error',
        'idempotency-conflict',
        'timeout',
        'invalid-idempotency-key',
        'idempotency-key-in-use',
        'idempotency-key-reused',
      ]),
    );
  });

  it('types ProblemType as the union of the slugs', () => {
    expectTypeOf<'upload-not-found'>().toExtend<ProblemType>();
    expectTypeOf<'no-such-problem'>().not.toExtend<ProblemType>();
  });
});

describe('roles', () => {
  it('lists roles from most to least privileged', () => {
    expect(ROLES).toEqual(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CLIENT']);
  });

  it('identifies staff roles', () => {
    expect(isStaffRole('STAFF')).toBe(true);
    expect(isStaffRole('SUPER_ADMIN')).toBe(true);
    expect(isStaffRole('CLIENT')).toBe(false);
  });
});

describe('contract types', () => {
  it('keeps ProblemDetails and CursorPage shapes stable', () => {
    expectTypeOf<ProblemDetails>().toHaveProperty('traceId').toEqualTypeOf<string>();
    expectTypeOf<CursorPage<number>['nextCursor']>().toEqualTypeOf<string | null>();
  });

  it('pins the Iteration 2 response bodies', () => {
    expectTypeOf<NewsletterSubscribeResponse>().toEqualTypeOf<{
      readonly status: 'pending_confirmation';
    }>();
    expectTypeOf<NewsletterConfirmResponse>().toEqualTypeOf<{ readonly status: 'confirmed' }>();
    expectTypeOf<NewsletterUnsubscribeResponse>().toEqualTypeOf<{
      readonly status: 'unsubscribed';
    }>();
    expectTypeOf<JobApplicationResponse>().toEqualTypeOf<{
      readonly id: string;
      readonly status: 'received';
    }>();
    expectTypeOf<UploadUrlResponse>().toEqualTypeOf<{
      readonly fileId: string;
      readonly uploadUrl: string;
      readonly method: 'PUT';
      readonly headers: Readonly<Record<string, string>>;
      readonly expiresAt: string;
    }>();
  });
});

describe('CACHE_TAGS', () => {
  it('names settings, content lists and entries', () => {
    expect(CACHE_TAGS.settings).toBe('settings');
    expect(CACHE_TAGS.contentList('blog-post')).toBe('content:blog-post');
    expect(CACHE_TAGS.contentEntry('blog-post', 'hello')).toBe('content:blog-post:hello');
  });
});
