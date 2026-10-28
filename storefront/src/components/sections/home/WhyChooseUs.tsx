import type { CSSProperties, ReactNode } from 'react';

import { cx } from '@agency/ui';

import type { HomePageData } from '@agency/validation';

import { whyFontVariables } from './why-fonts';

export interface WhyChooseUsProps {
  readonly comparison: HomePageData['comparison'];
}

type Option = HomePageData['comparison']['options'][number];

/** The green "Why Choose Us" pill over the heading. */
function Pill() {
  return (
    <p className="inline-flex rounded-3xl border border-[#12693d] px-3 py-1 font-why text-base leading-6 text-[#1fb268]">
      Why Choose Us
    </p>
  );
}

/** Accent words in the headings: Playfair Display italic. */
function Accent({ children }: { readonly children: string }) {
  return <em className="font-why-accent font-bold">{children}</em>;
}

const HEADING = 'mt-4 font-why-heading text-[clamp(2rem,3.4vw,3rem)] leading-[1.2] font-bold';
const ICON_PATHS: Record<Option['icon'], ReactNode> = {
  brand: (
    <>
      <path d="M16 4.5 18.6 12l7.9.1-6.3 4.7 2.3 7.6L16 19.9l-6.5 4.5 2.3-7.6-6.3-4.7 7.9-.1z" />
    </>
  ),
  team: (
    <>
      <circle cx="12" cy="11" r="4" />
      <circle cx="21.5" cy="12" r="3.2" />
      <path d="M4.5 25c.8-4.2 3.8-6.5 7.5-6.5s6.7 2.3 7.5 6.5M19.5 18.6c3.5-.4 6.6 1.6 7.5 5.4" />
    </>
  ),
  brush: (
    <>
      <path d="M25.5 5.5c-4.6 2.6-9.4 7.4-12 12l2 2c4.6-2.6 9.4-7.4 12-12z" />
      <path d="M13.5 17.5c-3 0-5 2-5 4.5 0 1.6-1 3-3 3.5 2.3 1.3 7.6 1.5 9.6-1.6 1-1.6.8-3.4.4-4.4" />
    </>
  ),
  person: (
    <>
      <circle cx="14" cy="10" r="5" />
      <path d="M5 26c.8-5 4.4-8 9-8 1.4 0 2.6.3 3.8.8M20 26l1-3.5 5-5 2.5 2.5-5 5z" />
    </>
  ),
  toolbox: (
    <>
      <rect x="4.5" y="9.5" width="23" height="15" rx="3" />
      <path d="M11.5 9.5v-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2M4.5 16h23M14 16v2.5h4V16" />
    </>
  ),
};

function OptionIcon({ icon }: { readonly icon: Option['icon'] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8"
    >
      {ICON_PATHS[icon]}
    </svg>
  );
}

/** ✓ (white) or ✗ (red) in a comparison cell, with its meaning for screen readers. */
function Mark({ value }: { readonly value: boolean | undefined }) {
  return value ? (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 40 41"
        fill="none"
        className="size-6 text-[#fafafa] lg:h-[41px] lg:w-10"
      >
        <path d="m7 21.5 9 9 17-18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Yes</span>
    </>
  ) : (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 40 41"
        fill="none"
        className="size-6 text-[#ef4444] lg:h-[41px] lg:w-10"
      >
        <path
          d="m9 10.5 22 22m0-22-22 22"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">No</span>
    </>
  );
}

/** Phones and tablets: the option, then its marks as labelled chips. Desktop: one table row. */
const ROW_GRID =
  'flex flex-wrap items-center gap-x-3 gap-y-4 px-5 lg:grid lg:grid-cols-[483fr_repeat(var(--cols),138fr)] lg:gap-0 lg:px-10';
const COLUMN = 'font-why-heading text-xl leading-6 font-bold text-[#fafafa]';

/**
 * The comparison (after the reference): a dark rounded panel with a green glow at the
 * top, the criteria as columns and the ways to get a site built as rows. The first row
 * (the studio) sits in a glowing card with a gradient rim. A real table, so it reads
 * row by row. Below desktop width each row stacks: the option, then a chip per column
 * with its name and mark, so nothing scrolls sideways.
 */
function Comparison({ comparison }: { readonly comparison: HomePageData['comparison'] }) {
  const { criteria, options } = comparison;
  if (options.length === 0) return null;
  const cols = { '--cols': criteria.length } as CSSProperties;
  return (
    <section
      aria-labelledby="compare-title"
      className="relative overflow-hidden rounded-[32px] bg-[#0a0a0a] px-4 py-[100px] md:px-[94px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[371px] bg-[radial-gradient(60%_100%_at_50%_0%,rgb(31_178_104/0.28),transparent_70%)]"
      />
      <div className="relative text-center">
        <Pill />
        <h2 id="compare-title" className={cx(HEADING, 'mx-auto max-w-[614px] text-[#fafafa]')}>
          Looking for an <Accent>Alternative?</Accent> <Accent>Think</Accent> One More Time!
        </h2>
      </div>

      <div className="relative mt-10">
        {/* A table by roles: a <table> cannot round and light up its first row. */}
        <div role="table" aria-labelledby="compare-title" style={cols}>
          {/* The column headings; below desktop each chip names its column instead. */}
          <div role="rowgroup" className="max-lg:sr-only">
            <div role="row" className={ROW_GRID}>
              <span role="columnheader" className={cx(COLUMN, 'text-left')}>
                Platform
              </span>
              {criteria.map((criterion) => (
                <span key={criterion} role="columnheader" className={cx(COLUMN, 'text-center')}>
                  {criterion}
                </span>
              ))}
            </div>
          </div>
          <div role="rowgroup" className="lg:mt-10">
            {options.map((option, index) => {
              const first = index === 0;
              return (
                <div
                  key={option.name}
                  role="row"
                  className={cx(
                    ROW_GRID,
                    'relative',
                    first
                      ? 'mb-4 rounded-[32px] bg-[#0a0a0a] py-6 shadow-[0_16px_24px_rgb(23_11_38/0.1),0_8px_24px_rgb(255_255_255/0.09)]'
                      : 'border-b border-white/10 py-8 last:border-b-0 lg:py-10',
                  )}
                >
                  {first ? (
                    <>
                      {/* Violet wash, glows at both ends and a gradient rim. */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(14%_60%_at_0%_100%,rgb(125_64_255/0.35),transparent),radial-gradient(14%_60%_at_100%_0%,rgb(125_64_255/0.4),transparent),linear-gradient(202deg,rgb(87_27_210/0.2),rgb(10_10_10/0.2))]"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-[1.5px] rounded-[33.5px] bg-[linear-gradient(183deg,#ebf8fc,#7fb8ef_30%,#5142f1_62%,#1d1d29)] p-[1.5px] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]"
                      />
                    </>
                  ) : null}
                  <div
                    role="rowheader"
                    className="relative flex w-full items-start gap-4 text-left lg:w-auto lg:items-center lg:gap-6"
                  >
                    <span
                      className={cx(
                        'grid size-14 shrink-0 place-items-center rounded-[10px] text-white lg:size-[85px]',
                        first ? 'bg-[#7d40ff]' : 'bg-[rgb(9_117_251/0.26)]',
                      )}
                    >
                      <OptionIcon icon={option.icon} />
                    </span>
                    <span className="max-w-[372px]">
                      <span className="block font-why-heading text-xl leading-[1.2] font-bold text-[#fafafa] lg:text-2xl lg:leading-[28.8px]">
                        {option.name}
                      </span>
                      <span className="mt-2 block text-base leading-[1.5] tracking-[0.36px] text-[#d4d4d4] lg:text-lg lg:leading-[27px]">
                        {option.summary}
                      </span>
                    </span>
                  </div>
                  {criteria.map((criterion, column) => (
                    <span
                      key={criterion}
                      role="cell"
                      className="relative flex items-center gap-1.5 rounded-full border border-white/10 py-1 pr-2.5 pl-3 text-sm text-[#d4d4d4] lg:justify-center lg:border-0 lg:p-0"
                    >
                      <span aria-hidden="true" className="lg:hidden">
                        {criterion}
                      </span>
                      <Mark value={option.values[column]} />
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Why choose us (after the designmonks.co comparison section): the dark comparison
 * panel, on the light page colour that shows round its corners.
 */
export function WhyChooseUs({ comparison }: WhyChooseUsProps) {
  if (comparison.options.length === 0) return null;
  return (
    <div className={cx(whyFontVariables, 'bg-paper font-why')}>
      <Comparison comparison={comparison} />
    </div>
  );
}
