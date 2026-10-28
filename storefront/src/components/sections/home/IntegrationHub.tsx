'use client';

import { cx } from '@agency/ui';
import { type CSSProperties, useRef, useState } from 'react';

import type { HomePageData } from '@agency/validation';
import { StaticImage } from '@/components/media/StaticImage';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export interface IntegrationHubProps {
  readonly integrations: HomePageData['integrations'];
  /** Brand name; its first letter is the mark in the middle. */
  readonly siteName: string;
}

/** The drawing's coordinate space: a square, the hub in the middle. */
const SIZE = 1000;
const CENTER = SIZE / 2;
/** Distance from the middle to each logo's centre. */
const RING = 430;
/** The lines start just inside the hub's disc, which covers their ends. */
const LINE_START = 60;
/** Line colours: warm next to the hub, violet or sand at the logo. */
const WARM = '#e9a77b';
const VIOLET = '#a855f7';
const SAND = '#dcb48c';

interface Spoke {
  /** Logo centre, as a percentage of the drawing's width and height. */
  readonly left: number;
  readonly top: number;
  /** SVG path from the hub to the logo. */
  readonly path: string;
  readonly end: { readonly x: number; readonly y: number };
  readonly endColor: string;
}

const round = (value: number) => Math.round(value * 10) / 10;
const polar = (radius: number, angle: number) => ({
  x: round(CENTER + radius * Math.cos(angle)),
  y: round(CENTER + radius * Math.sin(angle)),
});

/**
 * Where each logo sits and the line to it: evenly round the circle from the top,
 * clockwise. Every line leaves the hub turned a little ahead of its logo and swings
 * back into it, so together they swirl like the spokes of a pinwheel. Lines towards the
 * sides end in violet, those towards the top and bottom in sand.
 */
export function spokes(count: number): Spoke[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const start = polar(LINE_START, angle);
    const c1 = polar(RING * 0.42, angle + 0.42);
    const c2 = polar(RING * 0.72, angle - 0.12);
    const end = polar(RING, angle);
    return {
      left: (end.x / SIZE) * 100,
      top: (end.y / SIZE) * 100,
      path: `M${String(start.x)} ${String(start.y)}C${String(c1.x)} ${String(c1.y)} ${String(c2.x)} ${String(c2.y)} ${String(end.x)} ${String(end.y)}`,
      end,
      endColor: Math.abs(Math.cos(angle)) > 0.5 ? VIOLET : SAND,
    };
  });
}

/**
 * The tools a product connects to, in a circle around the brand mark (after the
 * "integrations" wheel of the reference). Curved lines join every logo to the hub and
 * pulses of light run along them into it, out of step; the hub sends out a soft
 * ripple and the logos bob gently. Scrolled into view, the hub appears first, the lines
 * draw outwards and the logos pop in one after another. Hovering a logo lights its
 * line, dims the rest and names the tool. Under reduced motion it is a still picture.
 * The logos are a list for assistive technology; the lines are decoration.
 */
export function IntegrationHub({ integrations, siteName }: IntegrationHubProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useScrollReveal(rootRef);
  const [active, setActive] = useState<number | null>(null);
  const geometry = spokes(integrations.length);

  return (
    <div
      ref={rootRef}
      data-hub={state}
      className="integration-hub relative mx-auto aspect-square w-full max-w-[880px] @container"
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
        className="absolute inset-0 size-full overflow-visible"
      >
        <defs>
          {geometry.map((spoke, index) => (
            <linearGradient
              key={index}
              id={`hub-line-${String(index)}`}
              gradientUnits="userSpaceOnUse"
              x1={CENTER}
              y1={CENTER}
              x2={spoke.end.x}
              y2={spoke.end.y}
            >
              <stop offset="0.15" stopColor={WARM} />
              <stop offset="1" stopColor={spoke.endColor} />
            </linearGradient>
          ))}
        </defs>
        {geometry.map((spoke, index) => (
          <g
            key={index}
            className={cx(
              'transition-opacity duration-300',
              active !== null && active !== index && 'opacity-30',
            )}
            style={{ '--i': index } as CSSProperties}
          >
            <path
              d={spoke.path}
              pathLength={100}
              fill="none"
              stroke={`url(#hub-line-${String(index)})`}
              strokeLinecap="round"
              className="hub-line"
              style={{ strokeWidth: active === index ? 4.5 : 3 }}
            />
            {/* A pulse of light running into the hub. */}
            <path
              d={spoke.path}
              pathLength={100}
              fill="none"
              stroke={`url(#hub-line-${String(index)})`}
              strokeWidth={6}
              strokeLinecap="round"
              className="hub-pulse"
            />
          </g>
        ))}
      </svg>

      {/* The hub: a white disc with the brand's first letter in a turning ring. */}
      <div className="hub-core absolute top-1/2 left-1/2 grid size-[19cqw] -translate-x-1/2 -translate-y-1/2 place-items-center">
        <span
          aria-hidden="true"
          className="hub-ripple absolute inset-0 rounded-full border border-[#e9a77b]"
        />
        <span className="relative grid size-full place-items-center rounded-full bg-white shadow-[0_10px_30px_rgb(15_15_15/0.12),0_0_0_1px_rgb(15_15_15/0.04)]">
          <span
            aria-hidden="true"
            className="hero-spin absolute inset-[9%] rounded-full bg-[conic-gradient(from_0deg,#e9a77b,#a855f7,#dcb48c,#e9a77b)] [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),black_calc(100%-2px))]"
          />
          <span
            aria-hidden="true"
            className="bg-[linear-gradient(135deg,#e07a45,#a855f7)] bg-clip-text font-hero-display text-[8.5cqw] leading-none font-semibold text-transparent"
          >
            {siteName.charAt(0)}
          </span>
        </span>
      </div>

      <ul aria-label="Tools we work with">
        {integrations.map((tool, index) => {
          const spoke = geometry[index];
          if (!spoke) return null;
          return (
            <li
              key={tool.name}
              className="hub-logo absolute size-[9.6cqw] -translate-x-1/2 -translate-y-1/2 hover:z-10"
              style={
                {
                  left: `${String(spoke.left)}%`,
                  top: `${String(spoke.top)}%`,
                  '--i': index,
                } as CSSProperties
              }
              onPointerEnter={() => {
                setActive(index);
              }}
              onPointerLeave={() => {
                setActive((current) => (current === index ? null : current));
              }}
            >
              <span className="hub-float group relative grid size-full place-items-center rounded-full bg-white shadow-[0_4px_14px_rgb(15_15_15/0.1),0_0_0_1px_rgb(15_15_15/0.05)] transition-[scale,box-shadow] duration-300 hover:scale-110 hover:shadow-[0_8px_24px_rgb(168_85_247/0.25),0_0_0_1px_rgb(168_85_247/0.25)]">
                <StaticImage
                  src={tool.logo.src}
                  alt={tool.logo.alt}
                  width={tool.logo.width}
                  height={tool.logo.height}
                  sizes="32px"
                  className="h-[52%] w-auto select-none"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 font-hero text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  {tool.name}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
