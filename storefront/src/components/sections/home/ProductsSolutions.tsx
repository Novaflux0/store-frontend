import { Container, cx } from '@agency/ui';

import type { HomePageData } from '@agency/validation';

import { heroFontVariables } from '../hero/hero-fonts';

import { IntegrationHub } from './IntegrationHub';

export interface ProductsSolutionsProps {
  readonly integrations: HomePageData['integrations'];
  /** Brand name; its first letter is the mark in the middle of the hub. */
  readonly siteName: string;
}

/**
 * Products and solutions (light, like the hero): a centred heading over the tools we
 * plug a product into, in a wheel around the brand (`IntegrationHub`). Renders only
 * when there are tools to show.
 */
export function ProductsSolutions({ integrations, siteName }: ProductsSolutionsProps) {
  if (integrations.length === 0) return null;
  return (
    <section
      aria-labelledby="solutions-title"
      className={cx(heroFontVariables, 'section-y overflow-x-clip bg-paper text-ink')}
    >
      <Container className="flex flex-col items-center text-center">
        <p className="font-hero text-sm tracking-[0.2em] text-ink/60 uppercase">What we ship</p>
        <h2
          id="solutions-title"
          className="mt-4 font-hero-display text-[clamp(2.25rem,3.6vw,3.75rem)] leading-[1.1] font-medium tracking-[-0.02em]"
        >
          Products and <em className="font-hero-serif font-normal">solutions</em>
        </h2>
        <p className="mt-5 max-w-xl font-hero text-lg leading-relaxed text-ink/70">
          Ready-made products and focused fixes, wired into the tools your team already uses.
        </p>
        <div className="mt-4 w-full">
          <IntegrationHub integrations={integrations} siteName={siteName} />
        </div>
      </Container>
    </section>
  );
}
