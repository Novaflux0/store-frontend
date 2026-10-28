'use client';

import { cx } from '@agency/ui';
import { type CSSProperties, useRef } from 'react';

import type { HomePageData } from '@agency/validation';
import { StaticImage } from '@/components/media/StaticImage';
import { useScrollReveal } from '@/hooks/useScrollReveal';

type Result = NonNullable<HomePageData['result']>;

export interface ResultNetworkProps {
  readonly people: Result['people'];
  readonly notes: Result['notes'];
}

/** The drawing's coordinate space (the reference's proportions). */
const WIDTH = 920;
const HEIGHT = 380;

/** Where the people sit, in order: two loose clusters with the notes between them. */
const PEOPLE_SPOTS = [
  [245, 35],
  [435, 87],
  [183, 155],
  [299, 191],
  [74, 233],
  [217, 290],
  [367, 311],
  [680, 50],
  [578, 102],
  [756, 139],
  [455, 212],
  [722, 232],
  [858, 238],
  [599, 295],
] as const;

/** Where the notes sit (their centres), in order. */
const NOTE_SPOTS = [
  [303, 121],
  [615, 199],
  [470, 277],
] as const;

const BLUE = '#9fcbe6';
const YELLOW = '#f4c76c';
const VIOLET = '#cdb6e8';

/**
 * The dotted links. Each joins two people (by spot), or a person and a note (`note`),
 * and is drawn only when the people it needs are there.
 */
const LINKS: readonly {
  readonly people: readonly number[];
  readonly note?: number;
  readonly d: string;
  readonly color: string;
}[] = [
  { people: [0, 6], d: 'M245 35C300 90 380 180 367 311', color: BLUE },
  { people: [2, 1], d: 'M183 155C230 80 360 60 435 87', color: BLUE },
  { people: [3, 5], d: 'M299 191C260 220 230 250 217 290', color: VIOLET },
  { people: [4, 5], d: 'M74 233C140 225 190 250 217 290', color: VIOLET },
  { people: [8, 10], d: 'M578 102C520 120 480 160 455 212', color: YELLOW },
  { people: [10], note: 1, d: 'M455 212C490 215 500 190 540 190', color: YELLOW },
  { people: [7, 9], d: 'M680 50C720 70 750 100 756 139', color: BLUE },
  { people: [9, 13], d: 'M756 139C700 165 640 200 599 295', color: BLUE },
  { people: [11, 12], d: 'M722 232C760 210 820 205 858 238', color: YELLOW },
];

const percent = (value: number, of: number) => `${String((value / of) * 100)}%`;

/**
 * "The Result" (after the reference): people in two loose clusters, joined by dotted
 * lines with notes floating between them, like a team working together. The dots
 * stream along the lines, and people and notes bob gently, out of step. Scrolled into
 * view, the lines fade in, then the people pop in one after another and the notes rise
 * into place. Hovering a person names them. Under reduced motion it is a still picture.
 * People and notes fill the layout's spots in order; extra ones are left out.
 */
export function ResultNetwork({ people, notes }: ResultNetworkProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useScrollReveal(rootRef);
  const links = LINKS.filter(
    (link) =>
      link.people.every((index) => index < people.length) &&
      (link.note === undefined || link.note < notes.length),
  );

  return (
    <div
      ref={rootRef}
      data-net={state}
      className="result-net relative mx-auto aspect-[920/380] w-full max-w-[1100px] min-w-[560px] @container"
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        className="absolute inset-0 size-full overflow-visible"
      >
        {links.map((link, index) => (
          <path
            key={link.d}
            d={link.d}
            fill="none"
            stroke={link.color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.1 8"
            className="net-link"
            style={{ '--i': index } as CSSProperties}
          />
        ))}
      </svg>

      <ul aria-label="Our team">
        {people.slice(0, PEOPLE_SPOTS.length).map((person, index) => {
          const [x, y] = PEOPLE_SPOTS[index] ?? [0, 0];
          return (
            <li
              key={`${person.name}-${String(index)}`}
              className="net-person absolute size-[4.8cqw] min-w-7 -translate-x-1/2 -translate-y-1/2 hover:z-10"
              style={
                {
                  left: percent(x, WIDTH),
                  top: percent(y, HEIGHT),
                  '--i': index,
                } as CSSProperties
              }
            >
              <span className="net-float group relative block size-full">
                <StaticImage
                  src={person.photo.src}
                  alt={person.photo.alt}
                  width={person.photo.width}
                  height={person.photo.height}
                  sizes="56px"
                  className="size-full rounded-full object-cover shadow-[0_0_0_3px_white,0_6px_16px_rgb(15_15_15/0.18)] transition-[scale] duration-300 select-none group-hover:scale-110"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 font-hero text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  {person.name}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <ul aria-label="Shared notes">
        {notes.slice(0, NOTE_SPOTS.length).map((note, index) => {
          const [x, y] = NOTE_SPOTS[index] ?? [0, 0];
          return (
            <li
              key={`${note.label}-${String(index)}`}
              className="net-note absolute -translate-x-1/2 -translate-y-1/2"
              style={
                {
                  left: percent(x, WIDTH),
                  top: percent(y, HEIGHT),
                  '--i': index,
                } as CSSProperties
              }
            >
              <span
                className={cx(
                  'net-float flex items-center gap-[0.6em] rounded-xl bg-white px-[1.1em] py-[0.7em] font-hero text-[clamp(0.75rem,1.6cqw,1.0625rem)] whitespace-nowrap text-ink/85',
                  'shadow-[0_8px_24px_rgb(15_15_15/0.08),0_0_0_1px_rgb(15_15_15/0.04)]',
                )}
              >
                {note.label}
                {note.icon ? (
                  <StaticImage
                    src={note.icon.src}
                    alt={note.icon.alt}
                    width={note.icon.width}
                    height={note.icon.height}
                    sizes="20px"
                    className="h-[1.2em] w-auto"
                  />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
