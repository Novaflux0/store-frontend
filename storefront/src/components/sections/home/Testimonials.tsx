import { Container, cx } from '@agency/ui';

import type { TestimonialData } from '@agency/validation';

import { heroFontVariables } from '../hero/hero-fonts';

import { TestimonialCarousel } from './TestimonialCarousel';

export interface TestimonialsProps {
  readonly testimonials: readonly TestimonialData[];
}

/** Reviews (Figma "Testimonials", 2107:794): the heading over the reviews carousel. */
export function Testimonials({ testimonials }: TestimonialsProps) {
  if (testimonials.length === 0) return null;
  return (
    <section
      aria-labelledby="testimonials-title"
      className={cx(heroFontVariables, 'section-y overflow-x-clip bg-paper text-ink')}
    >
      <Container>
        <div className="mx-auto max-w-[1660px]">
          <div className="flex max-w-[742px] flex-col gap-4">
            <p className="font-hero text-[clamp(1.125rem,1.25vw,1.5rem)] leading-[1.64] text-[#7c7c7c] [font-variation-settings:'opsz'_14]">
              What they say about us
            </p>
            <h2
              id="testimonials-title"
              className="font-hero-display text-[clamp(2.5rem,3.75vw,4.5rem)] leading-[1.18] font-medium tracking-[-0.02em]"
            >
              Reviews from our users
            </h2>
          </div>
          <div className="mt-14">
            <TestimonialCarousel testimonials={testimonials} />
          </div>
        </div>
      </Container>
    </section>
  );
}
