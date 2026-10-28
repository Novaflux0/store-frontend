import { Container } from '@agency/ui';

import { RevealHeading } from '@/components/animation/RevealHeading';
import { StaticImage } from '@/components/media/StaticImage';
import { CtaBanner } from '@/components/sections/CtaBanner';
import { PageHeader } from '@/components/sections/PageHeader';
import { initials } from '@/content/format';
import { getSettings, getStandardPage, listTeam } from '@/content/registry';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { standardPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  const { site } = await getSettings();
  return standardPageMetadata('about', '/about', {
    title: 'About',
    description: `Who we are and how we work: the team behind ${site.name}.`,
  });
}

const FALLBACK = {
  eyebrow: 'About',
  heading: 'A small studio with big ambitions',
  intro: 'We are designers and engineers who love the web.',
  highlights: [],
} as const;

export default async function AboutPage() {
  const [page, team] = await Promise.all([getStandardPage('about'), listTeam()]);
  const { eyebrow, heading, intro, highlights } = page?.data ?? FALLBACK;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <PageHeader {...(eyebrow ? { eyebrow } : {})} title={heading}>
        {intro}
      </PageHeader>

      {highlights.length > 0 ? (
        <Container as="section" aria-labelledby="values-title" className="section-y">
          <RevealHeading id="values-title" className="text-3xl font-semibold tracking-tight">
            How we work
          </RevealHeading>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {highlights.map((value) => (
              <li key={value.title} className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="text-lg font-semibold text-fg">{value.title}</h3>
                <p className="mt-2 text-muted">{value.summary}</p>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {team.length > 0 ? (
        <Container as="section" aria-labelledby="team-title" className="section-y">
          <RevealHeading id="team-title" className="text-3xl font-semibold tracking-tight">
            The team
          </RevealHeading>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map(({ slug, title, data }) => (
              <li key={slug} className="rounded-2xl border border-line bg-surface p-6">
                {data.photo ? (
                  <StaticImage
                    src={data.photo.src}
                    alt=""
                    width={data.photo.width}
                    height={data.photo.height}
                    sizes="4rem"
                    className="size-16 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-16 items-center justify-center rounded-full bg-surface-raised font-display text-xl text-neon-cyan"
                  >
                    {initials(title)}
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold text-fg">{title}</h3>
                <p className="text-sm text-muted">{data.role}</p>
                {data.bio ? <p className="mt-3 text-sm text-muted">{data.bio}</p> : null}
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
      <CtaBanner />
    </>
  );
}
