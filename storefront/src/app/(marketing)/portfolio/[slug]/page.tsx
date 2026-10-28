import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@agency/ui';

import { RichText } from '@/components/content/RichText';
import { StaticImage } from '@/components/media/StaticImage';
import { CtaBanner } from '@/components/sections/CtaBanner';
import { PageHeader } from '@/components/sections/PageHeader';
import { TagList } from '@/components/sections/TagList';
import { getCaseStudy, getSettings, listCaseStudies } from '@/content/registry';
import { SERVICE_LABELS } from '@/content/services';
import { JsonLd, breadcrumbJsonLd, creativeWorkJsonLd } from '@/lib/seo/json-ld';
import { orFallback, pageMetadata } from '@/lib/seo/metadata';

// Case studies published after the build render on first request (ISR).
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await listCaseStudies()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/portfolio/[slug]'>): Promise<Metadata> {
  const [work, settings] = await Promise.all([getCaseStudy((await params).slug), getSettings()]);
  if (!work) return {};
  return pageMetadata(
    {
      title: orFallback(work.data.seo?.title, work.title),
      description: orFallback(work.data.seo?.description, work.data.description),
      path: `/portfolio/${work.slug}`,
      image: work.data.cover,
      seo: work.data.seo,
    },
    settings,
  );
}

export default async function CaseStudyPage({ params }: PageProps<'/portfolio/[slug]'>) {
  const [work, settings] = await Promise.all([getCaseStudy((await params).slug), getSettings()]);
  if (!work) notFound();
  const { slug, title, data } = work;
  const path = `/portfolio/${slug}`;

  return (
    <>
      <JsonLd
        data={creativeWorkJsonLd(
          {
            title,
            description: data.description,
            path,
            dateCreated: data.date,
            client: data.client,
            image: data.cover.src,
            tags: data.tags,
          },
          settings.site,
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Portfolio', path: '/portfolio' },
          { name: title, path },
        ])}
      />
      <article>
        <PageHeader eyebrow={data.client} title={title}>
          <p>{data.description}</p>
          <TagList tags={data.tags} className="mt-4" />
        </PageHeader>
        <Container className="section-b">
          <StaticImage
            src={data.cover.src}
            alt={data.cover.alt}
            width={data.cover.width}
            height={data.cover.height}
            sizes="(min-width: 1920px) 1760px, 100vw"
            loading="eager"
            fetchPriority="high"
            className="h-auto w-full rounded-3xl border border-line"
          />
          <div className="mt-12 grid gap-12 lg:grid-cols-[2fr_1fr]">
            <div>
              <RichText doc={data.body} />
            </div>
            <aside aria-labelledby="work-facts" className="flex flex-col gap-8">
              <h2 id="work-facts" className="sr-only">
                Project facts
              </h2>
              <section aria-labelledby="work-results">
                <h3 id="work-results" className="text-lg font-semibold text-fg">
                  Results
                </h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {data.results.map((result) => (
                    <li
                      key={result}
                      className="rounded-xl border border-line bg-surface p-4 text-fg"
                    >
                      {result}
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="work-services">
                <h3 id="work-services" className="text-lg font-semibold text-fg">
                  Services
                </h3>
                <ul className="mt-3 flex flex-col gap-1 text-muted">
                  {data.services.map((service) => (
                    <li key={service}>{SERVICE_LABELS[service]}</li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
          <p className="mt-12">
            <Link href="/portfolio" className="font-medium text-neon-cyan hover:underline">
              <span aria-hidden="true">←</span> All projects
            </Link>
          </p>
        </Container>
      </article>
      <CtaBanner />
    </>
  );
}
