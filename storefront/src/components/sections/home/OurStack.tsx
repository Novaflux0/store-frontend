import { Container, cx } from '@agency/ui';

import type { HomePageData } from '@agency/validation';

import { heroFontVariables } from '../hero/hero-fonts';

import { StackFlow } from './StackFlow';

export interface OurStackProps {
  readonly tech: HomePageData['tech'];
  readonly siteName: string;
}

/** The tools we build with, flowing into the studio (`StackFlow`). Light, like the hero, and wide. */
export function OurStack({ tech, siteName }: OurStackProps) {
  if (tech.length === 0) return null;
  return (
    <section
      aria-labelledby="stack-title"
      className={cx(heroFontVariables, 'section-y bg-paper text-ink')}
    >
      <Container>
        <h2
          id="stack-title"
          className="text-center font-hero text-[clamp(1.75rem,2.6vw,2.5rem)] font-medium tracking-[-0.01em]"
        >
          Our stack
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center font-hero text-lg text-ink/70">
          Proven tools, wired together into one product.
        </p>
        <div className="mt-14">
          <StackFlow tech={tech} siteName={siteName} />
        </div>
      </Container>
    </section>
  );
}
