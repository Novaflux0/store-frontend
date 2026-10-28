import Link from 'next/link';
import type { CSSProperties } from 'react';

import { cx } from '@agency/ui';

import { StaticImage } from '@/components/media/StaticImage';
import type { FaqItem } from '@/lib/seo/json-ld';

import { aboutFontVariables } from './about-fonts';
import { faqFontVariables } from './faq-fonts';

export interface HomeFaqProps {
  readonly faqs: readonly FaqItem[];
  /** Links to the full FAQ page when the home page shows only a selection. */
  readonly moreHref?: '/faq';
}

/** Figma pixels of the 480-wide mosaic, as a share of its width (it scales down). */
const px = (value: number) => `${(value / 4.8).toFixed(3)}cqw`;

interface Tile {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly corners: CSSProperties;
}

/** A photo of the mosaic, cut to its Figma shape. */
function Photo({
  src,
  width,
  height,
  tile,
}: {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly tile: Tile;
}) {
  return (
    <span
      className="absolute overflow-hidden"
      style={{
        left: px(tile.left),
        top: px(tile.top),
        width: px(tile.width),
        height: px(tile.height),
        ...tile.corners,
      }}
    >
      <StaticImage
        src={src}
        alt=""
        width={width}
        height={height}
        sizes="(min-width: 80rem) 420px, 90vw"
        className="size-full object-cover"
      />
    </span>
  );
}

/** A figure tile: label over a large number. */
function Stat({
  label,
  value,
  tile,
  dark = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly tile: Tile;
  readonly dark?: boolean;
}) {
  return (
    <span
      className={cx(
        'absolute flex flex-col items-center font-faq-stat font-semibold',
        dark ? 'bg-[#267404] text-white' : 'bg-[#e9ffdf]',
      )}
      style={{
        left: px(tile.left),
        top: px(tile.top),
        width: px(tile.width),
        height: px(tile.height),
        paddingTop: px(80),
        paddingLeft: px(27),
        paddingRight: px(55),
        ...tile.corners,
      }}
    >
      <span className="flex flex-col items-center" style={{ width: px(108) }}>
        <span
          className={dark ? undefined : 'text-[#424957]'}
          style={{ fontSize: px(20), lineHeight: px(30) }}
        >
          {label}
        </span>
        <span
          className={cx('whitespace-nowrap', dark ? undefined : 'text-[#0c0a25]')}
          style={{ fontSize: px(48), lineHeight: px(72) }}
        >
          {value}
        </span>
      </span>
    </span>
  );
}

const ROUND = px(120);

/** The photo and figure mosaic left of the questions (Figma 2112:896). */
function Mosaic() {
  return (
    <div aria-hidden="true" className="w-full max-w-[480px] shrink-0 @container">
      <div className="relative aspect-[480/625]">
        <Photo
          src="/images/faq/desks.jpg"
          width={480}
          height={320}
          tile={{
            left: 0,
            top: 0,
            width: 192,
            height: 194.88,
            corners: { borderTopLeftRadius: ROUND },
          }}
        />
        <Stat
          label="Top Talents"
          value="1000+"
          tile={{
            left: 208,
            top: 0,
            width: 192,
            height: 196,
            corners: { borderTopRightRadius: ROUND },
          }}
        />
        <Photo
          src="/images/faq/team.jpg"
          width={1600}
          height={1066}
          tile={{
            left: 0,
            top: 210.87,
            width: 416,
            height: 203,
            corners: { borderBottomLeftRadius: ROUND, borderTopRightRadius: ROUND },
          }}
        />
        <Photo
          src="/images/faq/office.jpg"
          width={768}
          height={576}
          tile={{
            left: 0,
            top: 429.87,
            width: 192,
            height: 194.88,
            corners: { borderBottomLeftRadius: ROUND },
          }}
        />
        <Stat
          label="Projects"
          value="1000+"
          dark
          tile={{
            left: 208,
            top: 436.87,
            width: 192,
            height: 188,
            corners: { borderTopLeftRadius: ROUND },
          }}
        />
      </div>
    </div>
  );
}

/** A soft green glow (the Figma frame has one in two corners). */
const GLOW =
  'pointer-events-none absolute size-[450px] rounded-full bg-[#00ab0b] opacity-20 blur-[64px]';

/**
 * FAQ (Figma 2126:1136): a dark band with green glows, the photo mosaic on the left and
 * the questions on the right. The questions are native disclosure widgets, so they
 * work with the keyboard and screen readers without JavaScript and the answers stay in
 * the HTML for search engines (the page also emits FAQPage structured data). One
 * answer is open at a time (`name`); where supported, it slides open (globals.css).
 */
export function HomeFaq({ faqs, moreHref }: HomeFaqProps) {
  if (faqs.length === 0) return null;
  return (
    <section
      aria-labelledby="faq-title"
      className={cx(
        aboutFontVariables,
        faqFontVariables,
        'relative overflow-clip bg-[#070707] px-4 pt-[58px] pb-[100px] md:px-6',
      )}
    >
      <div aria-hidden="true" className={cx(GLOW, 'top-[-196px] right-[-197px]')} />
      <div aria-hidden="true" className={cx(GLOW, 'top-[604px] left-[-193px]')} />

      <div className="relative mx-auto flex max-w-[1574px] flex-col items-center gap-14 xl:flex-row">
        <Mosaic />
        <div className="flex w-full max-w-[1038px] flex-col gap-[33px]">
          <div className="flex max-w-[702px] flex-col gap-[17px]">
            <h2
              id="faq-title"
              className="font-about-heading text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.3] font-medium tracking-[-0.5px] text-[#e7e9f0]"
            >
              Frequently <em className="font-bold text-[#008e09]">Asked Questions</em>
            </h2>
            <p className="font-about-label text-base leading-normal font-normal text-[#c4cdd5]">
              Explore helpful information to better understand how we work and what you can expect
            </p>
          </div>
          <div>
            {faqs.map((faq) => (
              <details
                key={faq.question}
                name="home-faq"
                className="faq-item group border-b border-[#e5e5e5] pt-8 pb-[33px]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-about-heading text-[clamp(1.125rem,1.4vw,1.5rem)] leading-[1.2] font-semibold text-[#f4f6f8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#008e09] [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#008e09] p-px transition-colors duration-300 group-open:bg-[#008e09]/15">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static icon */}
                    <img
                      src="/images/faq/chevron.svg"
                      alt=""
                      width={24}
                      height={25}
                      className="h-[25px] w-6 transition-transform duration-300 group-open:rotate-180"
                    />
                  </span>
                </summary>
                <p className="max-w-[900px] pt-4 font-about-label text-base leading-[1.5] text-[#c4cdd5]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
          {moreHref === undefined ? null : (
            <p>
              <Link
                href={moreHref}
                className="font-about-label font-medium text-[#21d300] hover:underline"
              >
                See all questions <span aria-hidden="true">→</span>
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
