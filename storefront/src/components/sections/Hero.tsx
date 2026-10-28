import type { HomePageData, NavigationSettings } from '@agency/validation';
import type { Route } from 'next';
import Link from 'next/link';

import { Container, cx } from '@agency/ui';

import { HeroArt } from './hero/HeroArt';
import { HeroBackdrop } from './hero/HeroBackdrop';
import { heroFontVariables } from './hero/hero-fonts';
import { CENTRE_SPARKLES, SparkleRow } from './hero/HeroSparkles';
import { HeroTopBar } from './hero/HeroTopBar';
import { HeroVideoBadge } from './hero/HeroVideoBadge';
import { OUTLINE_BUTTON, OutlineGlowFilter } from './hero/OutlineGlow';
import { splitHeadline } from './hero/split-headline';

export interface HeroProps {
  /** Headline, subtitle, buttons and video (home page settings). */
  readonly hero: HomePageData['hero'];
  readonly siteName: string;
  /** The top bar shows `header` and `cta`. */
  readonly navigation: NavigationSettings;
}

/**
 * Home hero, built from the Figma hero design (exact at 1920px wide): the top bar,
 * a two-line headline whose first word is set in a glowing serif, the subtitle, two
 * buttons, and a "watch video" badge sitting in a notch on the background's bottom
 * edge. The background (`HeroBackdrop`) is opaque, so it covers the journey canvas.
 * `--hero-notch` is how far the notch reaches below the background.
 * Motion (none under reduced motion): the parts fade up one after another from the
 * first paint (`data-fade-in` with `--fade-delay`), then the stars twinkle, the beams
 * shimmer, the accent word's glow breathes and the badge's lettering turns.
 */
export function Hero({ hero, siteName, navigation }: HeroProps) {
  const { accent, rest, second } = splitHeadline(hero.headline);
  return (
    <section
      aria-labelledby="hero-title"
      className={cx(
        heroFontVariables,
        // The page colour shows around the rounded bottom corners and the notch.
        'relative isolate bg-paper pb-(--hero-notch)',
        hero.video ? '[--hero-notch:134px]' : '[--hero-notch:0px]',
      )}
    >
      <OutlineGlowFilter />
      <HeroBackdrop />
      {hero.video ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-[calc(50%-142px)] h-[142px] w-[284px]"
        >
          <HeroArt name="notch" />
        </div>
      ) : null}
      {/* No transforms or z-index between here and the backdrop: the sparkles blend with it. */}
      <Container className="relative flex flex-col items-center pt-[45px] pb-40 lg:pb-[210px]">
        <div className="relative flex w-full max-w-[1676px] flex-col items-center gap-16 lg:left-[-12px]">
          <HeroTopBar siteName={siteName} links={navigation.header} cta={navigation.cta} />
          <div className="flex w-full max-w-[1205px] flex-col items-center gap-[33px] text-center">
            <h1
              id="hero-title"
              className="font-hero-display text-[clamp(2.75rem,6.667vw,8rem)] leading-[1.05] font-normal tracking-normal text-balance text-white"
            >
              <span data-fade-in="" className="block [--fade-delay:0.1s]">
                <span className="relative inline-block bg-[linear-gradient(-59.355deg,#85ee00_21.631%,#fff_93.212%)] bg-clip-text font-hero-serif text-transparent">
                  {accent}
                  <span
                    aria-hidden="true"
                    className="hero-glow absolute inset-0 text-[#c4ff79] mix-blend-screen blur-[3.6px]"
                  >
                    {accent}
                  </span>
                </span>
                {rest ? ` ${rest}` : null}
              </span>
              {/* The space keeps the two lines apart in the heading's accessible name. */}
              {second ? (
                <>
                  {' '}
                  <span data-fade-in="" className="mt-[0.07em] block [--fade-delay:0.2s]">
                    {second}
                  </span>
                </>
              ) : null}
            </h1>
            {hero.subtitle ? (
              <p
                data-fade-in=""
                className="max-w-[1140px] [--fade-delay:0.3s] lg:max-w-[min(1140px,59.375vw)] bg-[linear-gradient(93.04deg,#fcfff8_1.947%,#bdd2a3_99.851%)] bg-clip-text font-hero text-[clamp(1rem,1.25vw,1.5rem)] leading-[1.34] tracking-[0.02em] text-transparent [font-variation-settings:'opsz'_14]"
              >
                {hero.subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {/* The entrance's transform isolates the sparkles' blending until it ends (1.1s). */}
        <div
          data-fade-in=""
          className="relative w-full [--fade-delay:0.4s] max-md:hidden md:mt-[30px] md:h-[100px]"
        >
          <SparkleRow art={CENTRE_SPARKLES} className="top-0 left-[calc(50%-299px)]" />
        </div>
        <div
          data-fade-in=""
          className="flex flex-wrap items-center justify-center gap-5 [--fade-delay:0.5s] max-md:mt-10 lg:gap-10"
        >
          <Link
            href={hero.primaryCta.href as Route}
            className="group relative flex h-14 items-center justify-center gap-4 rounded-[46px] bg-linear-to-r from-[#0ccc19] to-[#004505] pr-2 pl-5 font-hero text-lg leading-[1.64] font-medium text-white capitalize [font-variation-settings:'opsz'_14] lg:h-[72px] lg:pr-[10px] lg:pl-[23px] lg:text-[24px]"
          >
            {hero.primaryCta.label}
            <span className="block h-[34px] w-[49.4px] shrink-0 transition-transform group-hover:translate-x-0.5 lg:h-[46.166px] lg:w-[67.046px]">
              <HeroArt name="arrow-up-right" />
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_6px_-2px_13.8px_0_#c4ff79,inset_0_2px_15.6px_0_#c4ff79,inset_0_4px_14.8px_0_rgb(255_255_255/0.25)]"
            />
          </Link>
          {hero.secondaryCta ? (
            <Link
              href={hero.secondaryCta.href as Route}
              className={`${OUTLINE_BUTTON} h-14 text-lg font-medium capitalize lg:h-[72px] lg:text-[24px]`}
            >
              {hero.secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </Container>
      {hero.video ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[calc(100%-var(--hero-notch)-50px)] left-[calc(50%-232px)] h-[120px] w-[484px] mix-blend-hard-light"
          >
            <div className="absolute inset-[-184.42%_-45.72%]">
              <HeroArt name="badge-glow" />
            </div>
          </div>
          <HeroVideoBadge videoId={hero.video.youtubeId} />
        </>
      ) : null}
    </section>
  );
}
