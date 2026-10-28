import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@agency/ui';

import { ApplyForm } from '@/components/careers/ApplyForm';
import { RichText } from '@/components/content/RichText';
import { PageHeader } from '@/components/sections/PageHeader';
import {
  EMPLOYMENT_TYPE_LABELS,
  formatDate,
  formatJobLocation,
  formatSalary,
} from '@/content/format';
import { getJob, getSettings, listOpenJobs } from '@/content/registry';
import { clientEnv } from '@/lib/env/client';
import { JsonLd, breadcrumbJsonLd, jobPostingJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

import { requestCvUpload, submitApplication } from '../actions';

// Open roles published after the build render on first request (ISR); closed or
// unknown roles are a 404 (plan I2-10: the API only accepts slugs that exist).
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await listOpenJobs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/careers/[slug]'>): Promise<Metadata> {
  const [job, settings] = await Promise.all([getJob((await params).slug), getSettings()]);
  if (!job) return {};
  return pageMetadata(
    { title: job.title, description: job.data.description, path: `/careers/${job.slug}` },
    settings,
  );
}

export default async function JobPage({ params }: PageProps<'/careers/[slug]'>) {
  const [job, settings] = await Promise.all([getJob((await params).slug), getSettings()]);
  if (!job) notFound();
  const { slug, title, data } = job;
  const path = `/careers/${slug}`;
  const applicationsOpen = settings.features.careersApplications;
  const facts = [
    { term: 'Location', value: formatJobLocation(data.location) },
    { term: 'Employment type', value: EMPLOYMENT_TYPE_LABELS[data.employmentType] },
    { term: 'Team', value: data.department },
    ...(data.salary ? [{ term: 'Salary', value: formatSalary(data.salary) }] : []),
    { term: 'Apply by', value: formatDate(data.validThrough) },
  ];

  return (
    <>
      <JsonLd
        data={jobPostingJsonLd(
          {
            slug,
            title,
            description: data.description,
            path,
            datePosted: data.datePosted,
            validThrough: data.validThrough,
            employmentType: data.employmentType,
            department: data.department,
            location: data.location,
            salary: data.salary,
          },
          settings.site,
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Careers', path: '/careers' },
          { name: title, path },
        ])}
      />
      <PageHeader eyebrow={`Careers · ${data.department}`} title={title}>
        <p>{data.description}</p>
      </PageHeader>
      <Container className="section-b grid gap-12 lg:grid-cols-[2fr_1fr]">
        <div>
          <RichText doc={data.body} />
        </div>
        <aside aria-labelledby="job-facts">
          <h2 id="job-facts" className="text-lg font-semibold text-fg">
            At a glance
          </h2>
          <dl className="mt-4 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt className="text-sm text-muted">{fact.term}</dt>
                <dd className="text-fg">{fact.value}</dd>
              </div>
            ))}
          </dl>
          {applicationsOpen ? (
            <p className="mt-6">
              <a href="#apply" className="font-medium text-neon-cyan hover:underline">
                Apply now <span aria-hidden="true">↓</span>
              </a>
            </p>
          ) : null}
        </aside>
      </Container>
      <Container as="section" aria-labelledby="apply" className="section-b">
        <div className="max-w-3xl rounded-3xl border border-line bg-surface/60 p-6 md:p-10">
          <h2 id="apply" tabIndex={-1} className="text-3xl font-semibold tracking-tight text-fg">
            Apply for this role
          </h2>
          {applicationsOpen ? (
            <>
              <p className="mt-3 mb-8 text-muted">
                Tell us a little about yourself and attach your CV. We reply to every application.
              </p>
              <ApplyForm
                jobSlug={slug}
                jobTitle={title}
                turnstileSiteKey={clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                requestUpload={requestCvUpload}
                submitApplication={submitApplication}
              />
            </>
          ) : (
            <p className="mt-3 text-muted">
              Online applications are paused at the moment. Please write to{' '}
              <a
                href={`mailto:${settings.site.email}`}
                className="text-neon-cyan underline underline-offset-4 hover:decoration-2"
              >
                {settings.site.email}
              </a>{' '}
              and mention this role.
            </p>
          )}
        </div>
        <p className="mt-12">
          <Link href="/careers" className="font-medium text-neon-cyan hover:underline">
            <span aria-hidden="true">←</span> All open roles
          </Link>
        </p>
      </Container>
    </>
  );
}
