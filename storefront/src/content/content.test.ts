import { EMPLOYMENT_TYPES } from '@agency/validation/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ContentError,
  getEntry,
  getPreview,
  getPublicSettings,
  listEntries,
  parseEntry,
} from './cms';
import {
  EMPLOYMENT_TYPE_LABELS,
  formatDate,
  formatJobLocation,
  formatPrice,
  formatSalary,
  initials,
} from './format';
import { previewPath } from './preview';

const headers = vi.hoisted(() => ({
  draft: false,
  token: undefined as string | undefined,
}));

vi.mock('next/headers', () => ({
  draftMode: () => Promise.resolve({ isEnabled: headers.draft }),
  cookies: () =>
    Promise.resolve({
      get: () => (headers.token === undefined ? undefined : { value: headers.token }),
    }),
}));
vi.mock('@/lib/env/server', () => ({ getApiBaseUrl: () => 'http://api.test' }));

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };
const POST = {
  slug: 'hello',
  title: 'Hello',
  sortOrder: 0,
  publishedAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
  data: { description: 'A post.', date: '2026-10-14', tags: ['Next.js'], body: EMPTY_DOC },
};

/** The URL of a fetch call, whatever form it was passed in. */
function href(input: Parameters<typeof fetch>[0] | undefined): string {
  if (input === undefined) return '';
  return input instanceof Request ? input.url : input.toString();
}

function respond(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('CMS reads', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    headers.draft = false;
    headers.token = undefined;
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists entries with cache tags and drops the ones that fail validation', async () => {
    fetchMock.mockImplementation(() =>
      respond(200, [POST, { ...POST, slug: 'broken', data: { description: 'x' } }, { nope: 1 }]),
    );
    const entries = await listEntries('blog-post');
    expect(entries.map((entry) => entry.slug)).toEqual(['hello']);
    expect(entries[0]?.data).toMatchObject({ tags: ['Next.js'], date: '2026-10-14' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(href(url)).toBe('http://api.test/api/v1/content/blog-post');
    expect(init).toMatchObject({ cache: 'force-cache', next: { tags: ['content:blog-post'] } });
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('returns an empty list for a non-array answer', async () => {
    fetchMock.mockImplementation(() => respond(200, { not: 'a list' }));
    expect(await listEntries('service')).toEqual([]);
  });

  it('reads one entry with its own tag, and null for 404', async () => {
    fetchMock.mockImplementationOnce(() => respond(200, POST));
    expect((await getEntry('blog-post', 'hello'))?.title).toBe('Hello');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      next: { tags: ['content:blog-post', 'content:blog-post:hello'] },
    });
    fetchMock.mockImplementationOnce(() => respond(404));
    expect(await getEntry('blog-post', 'missing')).toBeNull();
  });

  it('never sends an invalid slug from the URL to the API', async () => {
    for (const slug of ['x.php', '..', 'a/b', 'Upper', '.env']) {
      expect(await getEntry('blog-post', slug)).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails loudly when the API is unreachable or broken', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('fetch failed')));
    await expect(listEntries('job')).rejects.toBeInstanceOf(ContentError);
    fetchMock.mockImplementationOnce(() => respond(503));
    await expect(listEntries('job')).rejects.toThrow(/answered 503/);
  });

  it('serves the previewed draft in Draft Mode, uncached', async () => {
    headers.draft = true;
    headers.token = 'signed-token';
    const draft = {
      type: 'blog-post',
      slug: 'hello',
      title: 'Draft title',
      updatedAt: POST.updatedAt,
      data: POST.data,
    };
    fetchMock.mockImplementation((url) =>
      href(url).includes('/content/preview') ? respond(200, draft) : respond(200, [POST]),
    );
    expect((await getEntry('blog-post', 'hello'))?.title).toBe('Draft title');
    const list = await listEntries('blog-post');
    expect(list.map((entry) => entry.title)).toEqual(['Draft title']);
    const previewCall = fetchMock.mock.calls.find(([url]) => href(url).includes('preview'));
    expect(href(previewCall?.[0])).toBe(
      'http://api.test/api/v1/content/preview?token=signed-token',
    );
    expect(previewCall?.[1]).toMatchObject({ cache: 'no-store' });
  });

  it('adds a new draft to lists and ignores drafts of other types', async () => {
    headers.draft = true;
    headers.token = 't';
    const draft = {
      type: 'blog-post',
      slug: 'new-one',
      title: 'New',
      updatedAt: POST.updatedAt,
      data: POST.data,
    };
    fetchMock.mockImplementation((url) =>
      href(url).includes('/content/preview') ? respond(200, draft) : respond(200, [POST]),
    );
    expect((await listEntries('blog-post')).map((entry) => entry.slug)).toEqual([
      'hello',
      'new-one',
    ]);
    expect(await listEntries('service')).toEqual([]);
  });

  it('treats an invalid preview token as no preview', async () => {
    fetchMock.mockImplementation(() => respond(400, { type: 'invalid-or-expired-token' }));
    expect(await getPreview('expired')).toBeNull();
  });

  it('validates the public settings and fails on a contract error', async () => {
    const settings = {
      site: {
        name: 'Agency',
        legalName: 'Agency Ltd.',
        tagline: 'Tagline',
        description: 'Description',
        email: 'hello@agency.com',
        social: [],
      },
      navigation: {
        start: [{ label: 'Work', href: '/portfolio' }],
        cta: { label: 'Talk', href: '/contact' },
      },
      seo: { titleTemplate: '%s | Agency', defaultTitle: 'Agency', defaultDescription: 'D' },
      features: {},
    };
    fetchMock.mockImplementationOnce(() => respond(200, settings));
    const parsed = await getPublicSettings();
    expect(parsed.features.newsletter).toBe(true);
    expect(parsed.navigation.more).toEqual([]);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ next: { tags: ['settings'] } });
    fetchMock.mockImplementationOnce(() => respond(200, { site: {} }));
    await expect(getPublicSettings()).rejects.toThrow(/Invalid public settings/);
  });

  it('validates single entries', () => {
    expect(parseEntry('team-member', { ...POST, data: { role: 'Designer' } })?.data).toEqual({
      role: 'Designer',
    });
    expect(parseEntry('team-member', { ...POST, data: { role: '' } })).toBeNull();
  });

  it('ignores fields a schema retired, so cached responses still parse', () => {
    const legal = { lastUpdated: '2026-10-01', body: EMPTY_DOC };
    // Legal pages never had `faqs`: an unknown field still drops the entry.
    expect(
      parseEntry('legal-page', { ...POST, slug: 'privacy', data: { ...legal, faqs: [] } }),
    ).toBeNull();
    const page = {
      ...POST,
      slug: 'about',
      data: { heading: 'About', intro: 'Hi', faqs: [] },
    };
    expect(parseEntry('page', page)?.data).toMatchObject({ heading: 'About', intro: 'Hi' });
  });
});

describe('preview paths', () => {
  it.each([
    ['blog-post', 'a', '/blog/a'],
    ['case-study', 'a', '/portfolio/a'],
    ['job', 'a', '/careers/a'],
    ['page', 'home', '/'],
    ['page', 'about', '/about'],
    ['legal-page', 'privacy', '/privacy'],
    ['service', 'seo', '/services'],
    ['team-member', 'x', '/about'],
    ['pricing-plan', 'x', '/pricing'],
    ['testimonial', 'x', '/'],
  ] as const)('opens %s/%s at %s', (type, slug, path) => {
    expect(previewPath(type, slug)).toBe(path);
  });
});

describe('content formatting', () => {
  it('formats dates in UTC', () => {
    expect(formatDate('2026-10-14')).toBe('October 14, 2026');
    expect(formatDate('2027-01-01')).toBe('January 1, 2027');
  });

  it('labels every employment type', () => {
    expect(Object.keys(EMPLOYMENT_TYPE_LABELS)).toEqual([...EMPLOYMENT_TYPES]);
  });

  it('formats job locations', () => {
    expect(formatJobLocation({ type: 'hybrid', city: 'Berlin', country: 'DE' })).toBe(
      'Berlin, Germany (hybrid)',
    );
    expect(formatJobLocation({ type: 'onsite', city: 'Austin', region: 'TX', country: 'US' })).toBe(
      'Austin, TX, United States',
    );
    expect(formatJobLocation({ type: 'remote', country: 'DE' })).toBe('Remote (Germany)');
  });

  it('formats salaries', () => {
    expect(formatSalary({ currency: 'EUR', min: 70000, max: 90000, unit: 'YEAR' })).toBe(
      '€70,000 to €90,000 per year',
    );
    expect(formatSalary({ currency: 'USD', min: 50, unit: 'HOUR' })).toBe('$50 per hour');
  });

  it('formats plan prices, with the note when there is none', () => {
    expect(
      formatPrice({ price: { currency: 'USD', amount: 4900, period: 'one-time', from: true } }),
    ).toBe('From $4,900');
    expect(
      formatPrice({ price: { currency: 'EUR', amount: 1200, period: 'month', from: false } }),
    ).toBe('€1,200 per month');
    expect(formatPrice({ priceNote: '$5k to $15k' })).toBe('$5k to $15k');
    expect(formatPrice({})).toBe('Custom quote');
  });

  it('derives avatar initials', () => {
    expect(initials('Alex Morgan')).toBe('AM');
    expect(initials('Ada Lovelace King')).toBe('AK');
    expect(initials('  plato ')).toBe('P');
  });
});
