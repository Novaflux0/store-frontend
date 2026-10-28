import { Container, cx } from '@agency/ui';

import type { HomePageData } from '@agency/validation';

import { InfiniteSlider } from '@/components/animation/InfiniteSlider';
import { StaticImage } from '@/components/media/StaticImage';

import { heroFontVariables } from '../hero/hero-fonts';

import { StatCounter } from './StatCounter';

export interface TrustedByProps {
  readonly clients: HomePageData['clients'];
  /** The home page's numbers, under the logos. */
  readonly stats: HomePageData['stats'];
}

/** Fades a line or row out towards both ends. */
const FADE_ENDS = '[mask-image:linear-gradient(to_right,transparent,black,transparent)]';

/**
 * Below the hero (light Figma design): a logo cloud, then the numbers. The logos
 * slide slowly left to right between two fading lines, fade out at both ends and ease
 * down to a crawl under the pointer (`InfiniteSlider`; still under reduced motion).
 * Each logo is a dark silhouette until hovered, when it fades to its own colours. The
 * numbers count up as they scroll into view. Each part renders only when it has content.
 */
export function TrustedBy({ clients, stats }: TrustedByProps) {
  if (clients.length === 0 && stats.length === 0) return null;
  return (
    <section
      aria-labelledby={clients.length > 0 ? 'clients-title' : 'results-title'}
      className={cx(heroFontVariables, 'section-b bg-paper pt-16 text-ink lg:pt-[127px]')}
    >
      <Container className="flex flex-col items-center gap-20 lg:gap-[120px]">
        {clients.length > 0 ? (
          <div className="w-full max-w-[1660px]">
            <h2 id="clients-title" className="sr-only">
              Trusted by teams at
            </h2>
            <div
              aria-hidden="true"
              className={cx('mx-auto mb-5 h-px max-w-3xl bg-ink/15', FADE_ENDS)}
            />
            <InfiniteSlider
              label="Client logos"
              gap={42}
              speed={30}
              speedOnHover={10}
              reverse
              className={cx('py-4', FADE_ENDS)}
            >
              {clients.map((client) => (
                <li key={client.name} className="shrink-0">
                  {/* Dark silhouette until hovered, then the logo's own colours. */}
                  <StaticImage
                    src={client.logo.src}
                    alt={client.logo.alt}
                    width={client.logo.width}
                    height={client.logo.height}
                    sizes={`${String(Math.round((40 * client.logo.width) / client.logo.height))}px`}
                    className="h-10 w-auto brightness-0 transition-[filter] duration-500 ease-out select-none hover:brightness-100"
                  />
                </li>
              ))}
            </InfiniteSlider>
            <div aria-hidden="true" className={cx('mt-5 h-px bg-ink/15', FADE_ENDS)} />
          </div>
        ) : null}
        {stats.length > 0 ? (
          <div>
            <h2 id="results-title" className="sr-only">
              Results in numbers
            </h2>
            <dl className="flex flex-wrap justify-center gap-x-[35px] gap-y-10">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col-reverse items-center gap-[14px] text-center"
                >
                  <dt className="font-hero text-[clamp(1.125rem,1.25vw,1.5rem)] leading-[1.64] [font-variation-settings:'opsz'_14]">
                    {stat.label}
                  </dt>
                  <dd className="font-hero-display text-[clamp(3rem,3.75vw,4.5rem)] leading-[1.18] font-medium tracking-[-0.02em]">
                    <StatCounter value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
