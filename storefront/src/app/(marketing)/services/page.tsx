import { Container } from '@agency/ui';

import { FadeIn } from '@/components/animation/FadeIn';
import { RichText } from '@/components/content/RichText';
import { CtaBanner } from '@/components/sections/CtaBanner';
import { StandardPageHeader } from '@/components/sections/StandardPageHeader';
import { listServices } from '@/content/registry';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { standardPageMetadata } from '@/lib/seo/page-metadata';

export function generateMetadata() {
  return standardPageMetadata('services', '/services', {
    title: 'Services',
    description:
      'Web design, web development, real-time 3D experiences, branding and SEO: everything you need to launch and grow.',
  });
}

export default async function ServicesPage() {
  const services = await listServices();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
        ])}
      />
      <StandardPageHeader
        slug="services"
        fallback={{
          eyebrow: 'Services',
          heading: 'Everything you need to launch and grow',
          intro:
            'One team from first sketch to production, with performance and accessibility built in.',
        }}
      />
      <Container as="section" aria-label="Our services" className="section-b">
        <ul className="grid gap-6 md:grid-cols-2">
          {services.map(({ slug, title, data }) => (
            // The id is the anchor that the home page and pricing link to (`/services#seo`).
            <li key={slug} id={slug}>
              <FadeIn className="h-full">
                <article className="h-full rounded-2xl border border-line bg-surface p-8">
                  <h2 className="text-2xl font-semibold text-fg">{title}</h2>
                  <p className="mt-3 text-muted">{data.summary}</p>
                  <h3 className="mt-6 text-sm font-medium tracking-wide text-fg uppercase">
                    What you get
                  </h3>
                  <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted">
                    {data.deliverables.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-neon-cyan" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {data.body ? (
                    <div className="mt-4">
                      <RichText doc={data.body} />
                    </div>
                  ) : null}
                </article>
              </FadeIn>
            </li>
          ))}
        </ul>
      </Container>
      <CtaBanner />
    </>
  );
}
