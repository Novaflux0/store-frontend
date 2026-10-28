import { describe, expect, it } from 'vitest';

import {
  articleJsonLd,
  creativeWorkJsonLd,
  faqPageJsonLd,
  jobPostingJsonLd,
  serializeJsonLd,
  type JobPostingInput,
} from './json-ld';
import { pageMetadata } from './metadata';

const SITE = { name: 'Agency' };
const SETTINGS = { site: SITE, seo: { titleTemplate: '%s | Agency' } };

const JOB: JobPostingInput = {
  slug: 'senior-frontend-engineer',
  title: 'Senior Frontend Engineer',
  description: 'Build <fast> & accessible sites.',
  path: '/careers/senior-frontend-engineer',
  datePosted: '2026-10-01',
  validThrough: '2027-12-31',
  employmentType: 'FULL_TIME',
  department: 'Engineering',
  location: { type: 'hybrid', city: 'Berlin', country: 'DE' },
  salary: { currency: 'EUR', min: 70000, max: 90000, unit: 'YEAR' },
};

describe('Article', () => {
  it('describes a blog post with absolute URLs', () => {
    const data = articleJsonLd(
      {
        title: 'Hello',
        description: 'A post.',
        path: '/blog/hello',
        datePublished: '2026-10-14',
        author: 'Agency studio',
        tags: ['A', 'B'],
      },
      SITE,
    );
    expect(data).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'Hello',
      url: 'http://localhost:3000/blog/hello',
      datePublished: '2026-10-14',
      author: { '@type': 'Organization', name: 'Agency studio' },
      publisher: { '@type': 'Organization', name: 'Agency' },
      keywords: 'A, B',
    });
  });

  it('falls back to the organisation as author', () => {
    const data = articleJsonLd(
      {
        title: 'Hello',
        description: 'A post.',
        path: '/blog/hello',
        datePublished: '2026-10-14',
        tags: [],
      },
      SITE,
    );
    expect(data.author).toMatchObject({ '@type': 'Organization', name: 'Agency' });
  });
});

describe('CreativeWork', () => {
  it('describes a case study', () => {
    expect(
      creativeWorkJsonLd(
        {
          title: 'Configurator',
          description: 'Desc',
          path: '/portfolio/configurator',
          dateCreated: '2026-08-20',
          client: 'Client',
          image: '/images/work/a.svg',
          tags: ['3D'],
        },
        SITE,
      ),
    ).toMatchObject({
      '@type': 'CreativeWork',
      image: 'http://localhost:3000/images/work/a.svg',
      sourceOrganization: { name: 'Client' },
      creator: { '@type': 'Organization' },
    });
  });
});

describe('JobPosting', () => {
  it("has Google's required properties for an on-site or hybrid role", () => {
    const data = jobPostingJsonLd(JOB, SITE);
    expect(data).toMatchObject({
      '@type': 'JobPosting',
      title: JOB.title,
      datePosted: '2026-10-01',
      validThrough: '2027-12-31T23:59:59Z',
      employmentType: 'FULL_TIME',
      hiringOrganization: { '@type': 'Organization', name: 'Agency' },
      jobLocation: {
        '@type': 'Place',
        address: { '@type': 'PostalAddress', addressLocality: 'Berlin', addressCountry: 'DE' },
      },
      identifier: { '@type': 'PropertyValue', value: JOB.slug },
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'EUR',
        value: { '@type': 'QuantitativeValue', minValue: 70000, maxValue: 90000, unitText: 'YEAR' },
      },
      directApply: true,
    });
    // The description is HTML; the authored text is escaped.
    expect(data.description).toBe('<p>Build &lt;fast&gt; &amp; accessible sites.</p>');
    expect(serializeJsonLd(data)).not.toMatch(/[<>&]/);
  });

  it('marks remote roles as telecommute with an applicant location', () => {
    const data = jobPostingJsonLd(
      {
        ...JOB,
        location: { type: 'remote', country: 'DE' },
        salary: { currency: 'EUR', min: 500, unit: 'DAY' },
      },
      SITE,
    );
    expect(data).toMatchObject({
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { '@type': 'Country', name: 'DE' },
      baseSalary: { value: { value: 500, unitText: 'DAY' } },
    });
    expect(data).not.toHaveProperty('jobLocation');
  });

  it('omits the salary when there is none', () => {
    expect(jobPostingJsonLd({ ...JOB, salary: undefined }, SITE)).not.toHaveProperty('baseSalary');
  });
});

describe('BlogPosting details', () => {
  it('adds the cover, modified date, section, word count and a team member as Person', () => {
    const data = articleJsonLd(
      {
        title: 'Hello',
        description: 'A post.',
        path: '/blog/hello',
        datePublished: '2026-10-14',
        dateModified: '2026-10-20T08:00:00.000Z',
        author: { name: 'Ada Lovelace', jobTitle: 'Engineer' },
        tags: [],
        image: '/images/cover.webp',
        section: 'Engineering',
        wordCount: 812,
      },
      SITE,
    );
    expect(data).toMatchObject({
      dateModified: '2026-10-20T08:00:00.000Z',
      image: ['http://localhost:3000/images/cover.webp'],
      articleSection: 'Engineering',
      wordCount: 812,
      author: { '@type': 'Person', name: 'Ada Lovelace', jobTitle: 'Engineer' },
    });
  });
});

describe('pageMetadata', () => {
  it('applies the CMS canonical, robots and social card overrides', () => {
    const image = { src: '/og.png', alt: 'Card', width: 1200, height: 630 };
    const metadata = pageMetadata(
      {
        title: 'Hello',
        description: 'A post.',
        path: '/blog/hello',
        image: '/cover.webp',
        seo: {
          canonical: 'https://example.com/original',
          robots: { index: false, follow: true },
          openGraph: { title: 'OG title', image },
          x: { description: 'On X' },
        },
      },
      { ...SETTINGS, seo: { ...SETTINGS.seo, xHandle: 'agency' } },
    );
    expect(metadata.alternates?.canonical).toBe('https://example.com/original');
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.openGraph).toMatchObject({
      title: 'OG title',
      description: 'A post.',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Card' }],
    });
    expect(metadata.twitter).toMatchObject({
      title: 'OG title',
      description: 'On X',
      site: '@agency',
      images: [{ url: '/og.png' }],
    });
  });

  it('sets no robots tag for an indexable page, so a draft preview stays noindex', () => {
    const metadata = pageMetadata(
      {
        title: 'X',
        description: 'Y',
        path: '/blog/x',
        seo: { robots: { index: true, follow: true } },
      },
      SETTINGS,
    );
    expect(metadata.robots).toBeUndefined();
    expect(
      pageMetadata(
        {
          title: 'X',
          description: 'Y',
          path: '/x',
          seo: { robots: { index: true, follow: false } },
        },
        SETTINGS,
      ).robots,
    ).toEqual({ index: true, follow: false });
  });

  it('uses Open Graph article for blog posts', () => {
    expect(
      pageMetadata(
        {
          title: 'Hello',
          description: 'A post.',
          path: '/blog',
          article: { publishedTime: '2026-10-14', tags: ['A'] },
        },
        SETTINGS,
      ).openGraph,
    ).toMatchObject({ type: 'article', publishedTime: '2026-10-14', tags: ['A'] });
  });

  it('marks pages noindex on request', () => {
    expect(
      pageMetadata(
        { title: 'X', description: 'Y', path: '/newsletter/confirm', noIndex: true },
        SETTINGS,
      ).robots,
    ).toEqual({ index: false, follow: true });
  });
});

describe('FAQPage', () => {
  it('lists every question with its accepted answer', () => {
    expect(
      faqPageJsonLd([
        { question: 'How much?', answer: 'It depends.' },
        { question: 'How long?', answer: 'Six weeks.' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How much?',
          acceptedAnswer: { '@type': 'Answer', text: 'It depends.' },
        },
        {
          '@type': 'Question',
          name: 'How long?',
          acceptedAnswer: { '@type': 'Answer', text: 'Six weeks.' },
        },
      ],
    });
  });
});
