import { Container } from '@agency/ui';

import { CtaBanner } from '@/components/sections/CtaBanner';
import { StandardPageHeader } from '@/components/sections/StandardPageHeader';
import { WorkGrid } from '@/components/sections/WorkGrid';
import { listCaseStudies } from '@/content/registry';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { standardPageMetadata } from '@/lib/seo/page-metadata';

export function generateMetadata() {
  return standardPageMetadata('portfolio', '/portfolio', {
    title: 'Portfolio',
    description: 'Websites, web apps and 3D experiences we have designed and built.',
  });
}

export default async function PortfolioPage() {
  const items = await listCaseStudies();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Portfolio', path: '/portfolio' },
        ])}
      />
      <StandardPageHeader
        slug="portfolio"
        fallback={{
          eyebrow: 'Portfolio',
          heading: 'Work that moves people',
          intro: 'Websites, web apps and 3D experiences, with the results they delivered.',
        }}
      />
      <Container as="section" aria-label="Projects" className="section-b">
        <WorkGrid items={items} headingLevel="h2" eagerImages={3} />
      </Container>
      <CtaBanner />
    </>
  );
}
