import { describe, expect, it } from 'vitest';

import { type ContentType, PAGE_SLUGS } from './admin-options.js';
import {
  contentDataSchema,
  contentListQuerySchema,
  createContentSchema,
  homePageDataSchema,
  imageSchema,
  jobDataSchema,
  pricingPlanDataSchema,
  scheduleContentSchema,
  standardPageDataSchema,
  updateContentSchema,
} from './content/index.js';
import { EMPTY_RICH_TEXT } from './rich-text.js';

const image = { src: '/images/a.webp', alt: 'A', width: 800, height: 600 };
const link = { label: 'Start', href: '/contact' };

const SAMPLES = {
  'blog-post': { description: 'D', date: '2026-10-01', body: EMPTY_RICH_TEXT },
  'blog-category': { description: 'Guides on design systems' },
  'case-study': {
    description: 'D',
    date: '2026-10-01',
    client: 'Acme',
    services: ['web-design'],
    results: ['Up 30%'],
    cover: image,
    body: EMPTY_RICH_TEXT,
  },
  job: {
    description: 'D',
    location: { type: 'remote', country: 'DE' },
    employmentType: 'FULL_TIME',
    department: 'Engineering',
    datePosted: '2026-10-01',
    validThrough: '2026-12-01',
    body: EMPTY_RICH_TEXT,
  },
  service: { serviceKey: 'seo', summary: 'S', deliverables: ['Audit'] },
  'team-member': { role: 'Designer' },
  testimonial: { quote: 'Great', author: 'Ada', role: 'CTO', company: 'Acme' },
  'pricing-plan': { summary: 'S', features: ['A'], cta: link },
  faq: { answer: 'Yes.' },
} as const;

describe('contentDataSchema', () => {
  it.each(Object.entries(SAMPLES))('accepts a minimal %s', (type, data) => {
    const schema = contentDataSchema(type as ContentType, 'any-slug');
    expect(schema.safeParse(data).success).toBe(true);
  });

  it('chooses the page schema by slug and rejects unknown pages', () => {
    expect(contentDataSchema('page', 'home')).toBe(homePageDataSchema);
    for (const slug of PAGE_SLUGS.filter((s) => s !== 'home')) {
      expect(contentDataSchema('page', slug)).toBe(standardPageDataSchema);
    }
    expect(contentDataSchema('page', 'nope').safeParse({}).success).toBe(false);
    expect(contentDataSchema('legal-page', 'nope').safeParse({}).success).toBe(false);
    expect(
      contentDataSchema('legal-page', 'privacy').safeParse({
        lastUpdated: '2026-10-01',
        body: EMPTY_RICH_TEXT,
      }).success,
    ).toBe(true);
  });

  it('rejects unknown fields in the data', () => {
    expect(
      contentDataSchema('team-member', 'x').safeParse({ role: 'A', html: '<b>' }).success,
    ).toBe(false);
  });

  it('validates jobs across fields', () => {
    expect(jobDataSchema.safeParse({ ...SAMPLES.job, validThrough: '2026-09-01' }).success).toBe(
      false,
    );
    expect(
      jobDataSchema.safeParse({ ...SAMPLES.job, location: { type: 'onsite', country: 'DE' } })
        .success,
    ).toBe(false);
    expect(
      jobDataSchema.safeParse({
        ...SAMPLES.job,
        salary: { currency: 'EUR', min: 10, max: 5, unit: 'YEAR' },
      }).success,
    ).toBe(false);
  });

  it('accepts a priced plan', () => {
    const plan = {
      ...SAMPLES['pricing-plan'],
      price: { currency: 'EUR', amount: 4900, period: 'one-time' },
    };
    expect(pricingPlanDataSchema.parse(plan).price).toEqual({
      currency: 'EUR',
      amount: 4900,
      period: 'one-time',
      from: false,
    });
  });
});

describe('imageSchema', () => {
  it.each([
    '/images/a.webp',
    'https://media.example.com/a/1280.avif',
    'http://localhost:9000/media/a.webp',
  ])('accepts %j', (src) => {
    expect(imageSchema.safeParse({ ...image, src }).success).toBe(true);
  });

  it.each([
    '//evil.example/a.png',
    'data:image/png;base64,AAAA',
    'javascript:x',
    '/a.exe',
    'https://media.example.com/a.webp);position:fixed;inset:0',
    "https://media.example.com/a'.webp",
  ])('rejects %j', (src) => {
    expect(imageSchema.safeParse({ ...image, src }).success).toBe(false);
  });
});

describe('content requests', () => {
  it('creates drafts with a slug, title and raw data', () => {
    expect(
      createContentSchema.safeParse({ slug: 'hello-world', title: 'Hello', data: {} }).success,
    ).toBe(true);
    expect(
      createContentSchema.safeParse({ slug: 'Hello World', title: 'Hello', data: {} }).success,
    ).toBe(false);
  });

  it('requires the version on updates and schedules', () => {
    expect(updateContentSchema.safeParse({ title: 'x' }).success).toBe(false);
    expect(updateContentSchema.safeParse({ version: 2, title: 'x' }).success).toBe(true);
    expect(
      scheduleContentSchema.safeParse({ version: 1, publishAt: '2026-11-01T09:00:00+01:00' })
        .success,
    ).toBe(true);
    expect(scheduleContentSchema.safeParse({ version: 1, publishAt: 'tomorrow' }).success).toBe(
      false,
    );
  });

  it('filters lists by status', () => {
    expect(contentListQuerySchema.parse({ status: 'draft' })).toEqual({
      status: 'draft',
      limit: 20,
    });
    expect(contentListQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('validates a full home page', () => {
    const home = {
      hero: { headline: 'We build', primaryCta: link },
      clients: [],
      solutions: [],
      stats: [{ value: 40, label: 'Projects' }],
      process: [
        { title: 'A', summary: 'a', duration: '1 week' },
        { title: 'B', summary: 'b', duration: '1 week' },
        { title: 'C', summary: 'c', duration: '1 week' },
      ],
      strengths: [],
      comparison: { criteria: ['Speed'], options: [] },
      tech: [],
      about: { mission: 'M', body: 'B', teamPhoto: image },
      ctaBanner: { title: 'Ready?', cta: link },
    };
    expect(homePageDataSchema.parse(home).stats[0]).toEqual({
      value: 40,
      label: 'Projects',
      suffix: '',
      decimals: 0,
    });
  });

  it('takes an optional hero subtitle and video, and no longer takes typed phrases', () => {
    const hero = { headline: 'Design with purpose.', primaryCta: link };
    const heroSchema = homePageDataSchema.shape.hero;
    expect(
      heroSchema.parse({ ...hero, subtitle: 'We design.', video: { youtubeId: 'aqz-KE-bpKQ' } }),
    ).toMatchObject({ subtitle: 'We design.', video: { youtubeId: 'aqz-KE-bpKQ' } });
    expect(heroSchema.safeParse({ ...hero, video: { youtubeId: 'not-an-id' } }).success).toBe(
      false,
    );
    expect(heroSchema.safeParse({ ...hero, phrases: ['fast sites'] }).success).toBe(false);
  });
});

describe('blog post SEO fields', () => {
  const schema = contentDataSchema('blog-post', 'guide');
  const base = { description: 'D', date: '2026-10-01', body: EMPTY_RICH_TEXT };

  it('accepts a fully filled post and defaults the table of contents to on', () => {
    const parsed = schema.parse({
      ...base,
      category: 'design',
      authorRef: 'ada-lovelace',
      cover: {
        ...image,
        title: 'Hero',
        caption: 'Our studio',
        href: 'https://example.com/landing',
        newTab: true,
      },
      faq: [{ question: 'Why?', answer: 'Because.' }],
      seo: {
        title: 'Guide',
        description: 'A guide',
        focusKeyword: 'design systems',
        canonical: '/blog/original-guide',
        robots: {},
        openGraph: { title: 'OG', image },
        x: { description: 'On X' },
      },
    }) as { tableOfContents: boolean; seo: { robots: unknown } };
    expect(parsed.tableOfContents).toBe(true);
    expect(parsed.seo.robots).toEqual({ index: true, follow: true });
  });

  it.each(['javascript:alert(1)', '//evil.example', '/\\evil.example', 'http://example.com'])(
    'rejects the canonical URL %j',
    (canonical) => {
      expect(schema.safeParse({ ...base, seo: { canonical } }).success).toBe(false);
    },
  );

  it('limits the X title to 70 characters and the FAQ to 20 entries', () => {
    expect(schema.safeParse({ ...base, seo: { x: { title: 'a'.repeat(71) } } }).success).toBe(
      false,
    );
    const faq = Array.from({ length: 21 }, () => ({ question: 'Q', answer: 'A' }));
    expect(schema.safeParse({ ...base, faq }).success).toBe(false);
  });

  it('rejects an unsafe cover link', () => {
    const cover = { ...image, href: 'javascript:alert(1)' };
    expect(schema.safeParse({ ...base, cover }).success).toBe(false);
  });
});

describe('home page features', () => {
  it('defaults featured to false and validates FAQ entries', () => {
    expect(
      contentDataSchema('service', 's').parse({
        serviceKey: 'seo',
        summary: 'S',
        deliverables: ['A'],
      }),
    ).toMatchObject({ featured: false });
    expect(contentDataSchema('faq', 'q').parse({ answer: 'Yes.', featured: true })).toEqual({
      answer: 'Yes.',
      featured: true,
    });
    expect(contentDataSchema('faq', 'q').safeParse({ answer: '' }).success).toBe(false);
  });

  it('reads the featured filter from a query string', () => {
    expect(contentListQuerySchema.parse({ featured: 'true' })).toMatchObject({ featured: true });
    expect(contentListQuerySchema.parse({ featured: 'false' })).toMatchObject({ featured: false });
    expect(contentListQuerySchema.safeParse({ featured: 'maybe' }).success).toBe(false);
  });
});
