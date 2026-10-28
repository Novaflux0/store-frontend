import { describe, expect, it } from 'vitest';

import {
  detectRedirectIssues,
  normalizeRedirectPath,
  normalizeRedirectTarget,
  type RedirectRule,
  resolveRedirect,
} from './redirect-rules.js';
import { redirectInputSchema, seoEventSchema } from './redirects.js';

describe('normalizeRedirectPath', () => {
  it.each([
    ['/Old-Page/', '/old-page'],
    ['  /blog//post?utm=1#top ', '/blog/post'],
    ['/caf%C3%A9', '/café'],
    ['/a/b/c', '/a/b/c'],
  ])('normalises %j to %j', (input, expected) => {
    expect(normalizeRedirectPath(input)).toBe(expected);
  });

  it.each([
    '',
    '/',
    'old-page',
    'https://x.com/a',
    '/api/v1/x',
    '/_next/static/a',
    '/a/../b',
    '/a\\b',
    '/a b',
    '/robots.txt',
    '/old.html',
    '/%E0%A4%A',
  ])('refuses %j', (input) => {
    expect(normalizeRedirectPath(input)).toBeNull();
  });
});

describe('normalizeRedirectTarget', () => {
  it('accepts site paths (keeping the query) and https URLs', () => {
    expect(normalizeRedirectTarget('/')).toBe('/');
    expect(normalizeRedirectTarget('/Contact/?topic=seo')).toBe('/contact?topic=seo');
    expect(normalizeRedirectTarget('https://Example.com/a')).toBe('https://example.com/a');
  });

  it.each(['http://example.com', 'javascript:alert(1)', '//evil.example', '/a b', 'x'])(
    'refuses %j',
    (input) => {
      expect(normalizeRedirectTarget(input)).toBeNull();
    },
  );
});

const rule = (
  id: string,
  source: string,
  target: string | null,
  statusCode: 301 | 302 | 410 = 301,
): RedirectRule => ({ id, source, target, statusCode });

describe('detectRedirectIssues', () => {
  it('finds duplicates, chains and loops', () => {
    const issues = detectRedirectIssues([
      rule('dup1', '/same', '/x'),
      rule('dup2', '/same', '/y'),
      rule('chain', '/a', '/b'),
      rule('end', '/b', '/c'),
      rule('loop1', '/p', '/q'),
      rule('loop2', '/q', '/p'),
      rule('external', '/e', 'https://example.com/'),
      rule('gone', '/g', null, 410),
    ]);
    expect(issues.get('dup1')).toEqual(['duplicate']);
    expect(issues.get('dup2')).toEqual(['duplicate']);
    expect(issues.get('chain')).toEqual(['chain']);
    expect(issues.get('end')).toBeUndefined();
    expect(issues.get('loop1')).toEqual(['loop']);
    expect(issues.get('loop2')).toEqual(['loop']);
    expect(issues.has('external')).toBe(false);
    expect(issues.has('gone')).toBe(false);
  });
});

describe('resolveRedirect', () => {
  const rules = [
    rule('1', '/a', '/b'),
    rule('2', '/b', '/c?x=1', 302),
    rule('3', '/gone', null, 410),
    rule('4', '/to-gone', '/gone'),
  ];

  it('follows chains to the final target, temporary if any hop is', () => {
    expect(resolveRedirect(rules, '/a')).toEqual({ target: '/c?x=1', statusCode: 302 });
    expect(resolveRedirect(rules, '/to-gone')).toEqual({ target: null, statusCode: 410 });
    expect(resolveRedirect(rules, '/nope')).toBeNull();
    expect(resolveRedirect([rule('1', '/p', '/q'), rule('2', '/q', '/p')], '/p')).toBeNull();
  });
});

describe('redirectInputSchema', () => {
  it('normalises and accepts a 301 and a 410', () => {
    expect(redirectInputSchema.parse({ source: '/Old/', target: '/new', statusCode: 301 })).toEqual(
      {
        source: '/old',
        target: '/new',
        statusCode: 301,
      },
    );
    expect(redirectInputSchema.parse({ source: '/gone', statusCode: 410 })).toMatchObject({
      statusCode: 410,
    });
  });

  it('refuses a missing target, a target on a 410 and a self-redirect', () => {
    expect(redirectInputSchema.safeParse({ source: '/a', statusCode: 301 }).success).toBe(false);
    expect(
      redirectInputSchema.safeParse({ source: '/a', target: '/b', statusCode: 410 }).success,
    ).toBe(false);
    expect(
      redirectInputSchema.safeParse({ source: '/a', target: '/A/', statusCode: 302 }).success,
    ).toBe(false);
    expect(
      redirectInputSchema.safeParse({ source: '/a', target: '/b', statusCode: 307 }).success,
    ).toBe(false);
  });

  it('validates storefront events', () => {
    expect(seoEventSchema.safeParse({ kind: 'not-found', path: '/x' }).success).toBe(true);
    expect(seoEventSchema.safeParse({ kind: 'other', path: '/x' }).success).toBe(false);
  });
});
