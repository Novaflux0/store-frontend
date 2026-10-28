import Link from 'next/link';

import { Container } from '@agency/ui';

import { EmptyState } from '@/components/sections/EmptyState';
import { StandardPageHeader } from '@/components/sections/StandardPageHeader';
import { EMPLOYMENT_TYPE_LABELS, formatJobLocation } from '@/content/format';
import { getSettings, listOpenJobs } from '@/content/registry';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { standardPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  const { site } = await getSettings();
  return standardPageMetadata('careers', '/careers', {
    title: 'Careers',
    description: `Open roles at ${site.name}. Join a team that builds fast, accessible and beautiful web experiences.`,
  });
}

export default async function CareersPage() {
  const [roles, { site }] = await Promise.all([listOpenJobs(), getSettings()]);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Careers', path: '/careers' },
        ])}
      />
      <StandardPageHeader
        slug="careers"
        fallback={{
          eyebrow: 'Careers',
          heading: 'Build the future of the web with us',
          intro: 'A small, senior team that cares about craft, performance and accessibility.',
        }}
      />
      <Container as="section" aria-label="Open roles" className="section-b">
        {roles.length === 0 ? (
          <EmptyState title="No open roles right now">
            <p>
              We are not hiring at the moment, but we always like to meet talented people. Send a
              short note to{' '}
              <a
                href={`mailto:${site.email}`}
                className="text-neon-cyan underline underline-offset-4 hover:decoration-2"
              >
                {site.email}
              </a>
              .
            </p>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {roles.map(({ slug, title, data }) => (
              <li key={slug}>
                <article className="relative flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6 transition-colors focus-within:border-neon-cyan hover:border-neon-cyan md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted">{data.department}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-fg">
                      <Link
                        href={`/careers/${slug}`}
                        className="after:absolute after:inset-0 after:rounded-2xl"
                      >
                        {title}
                      </Link>
                    </h2>
                    <p className="mt-2 max-w-2xl text-muted">{data.description}</p>
                  </div>
                  <dl className="flex shrink-0 flex-col gap-1 text-sm md:text-right">
                    <div>
                      <dt className="sr-only">Location</dt>
                      <dd className="text-fg">{formatJobLocation(data.location)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Employment type</dt>
                      <dd className="text-muted">{EMPLOYMENT_TYPE_LABELS[data.employmentType]}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
