import type { CSSProperties } from 'react';

import { Container, cx } from '@agency/ui';

import type { HomePageData } from '@agency/validation';

import { heroFontVariables } from '../hero/hero-fonts';

import { WorkDeck } from './WorkDeck';

export interface ProcessStepsProps {
  readonly steps: HomePageData['process'];
}

/**
 * Work Progress (light, like the hero). On large screens with motion allowed, the
 * section is a tall scroll track with a sticky stage (`.process-track` /
 * `.process-stage` in globals.css) and the step cards move through a deck as you
 * scroll (`WorkDeck`); everywhere else it is a plain list of cards.
 */
export function ProcessSteps({ steps }: ProcessStepsProps) {
  return (
    <section
      aria-labelledby="process-title"
      className={cx(heroFontVariables, 'process-track bg-paper text-ink')}
      style={{ '--steps': steps.length } as CSSProperties}
    >
      <div className="process-stage section-y overflow-x-clip">
        <Container>
          <WorkDeck steps={steps} />
        </Container>
      </div>
    </section>
  );
}
