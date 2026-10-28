import { Container, cx } from '@agency/ui';

import type { HomePageData } from '@agency/validation';

import { heroFontVariables } from '../hero/hero-fonts';

import { ResultNetwork } from './ResultNetwork';

export interface TheResultProps {
  readonly result: HomePageData['result'];
}

/**
 * "The Result", after the case studies (light, like the hero): a centred heading over
 * the team network (`ResultNetwork`). Below its minimum width the network keeps its
 * size and is cropped at both sides. Renders only when the section has people.
 */
export function TheResult({ result }: TheResultProps) {
  if (!result || result.people.length === 0) return null;
  return (
    <section
      aria-labelledby="result-title"
      className={cx(heroFontVariables, 'section-y overflow-x-clip bg-paper text-ink')}
    >
      <Container className="flex flex-col items-center text-center">
        <p className="font-hero text-sm text-ink/60">{result.eyebrow}</p>
        <h2
          id="result-title"
          className="mt-3 font-hero text-[clamp(2rem,3vw,2.75rem)] leading-[1.15] font-medium tracking-[-0.01em]"
        >
          {result.title}
        </h2>
      </Container>
      <div className="mt-8 flex justify-center px-4 lg:mt-10">
        <ResultNetwork people={result.people} notes={result.notes} />
      </div>
    </section>
  );
}
