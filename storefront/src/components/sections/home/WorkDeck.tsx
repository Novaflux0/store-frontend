'use client';

import { cx } from '@agency/ui';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import type { HomePageData } from '@agency/validation';
import { StaticImage } from '@/components/media/StaticImage';

/** Same condition as the pinned `.process-track` rules in globals.css. */
const PINNED_QUERY =
  '(min-width: 64rem) and (min-height: 40rem) and (prefers-reduced-motion: no-preference)';

type Step = HomePageData['process'][number];

export interface WorkDeckProps {
  readonly steps: HomePageData['process'];
}

/**
 * A card's place in the deck by depth (0 = the current step, in front on the right;
 * 1, 2, … = the next steps, further left and smaller), in percent of the deck's width:
 * left edge, width, height and label size. The last one is out of sight.
 */
const SLOTS = [
  { x: 42, w: 58, h: 38, fs: 1.9, o: 1 },
  { x: 21.2, w: 21, h: 33.3, fs: 1.35, o: 1 },
  { x: 4.5, w: 16.9, h: 27.1, fs: 1.05, o: 1 },
  { x: -9, w: 14.5, h: 23, fs: 0.9, o: 1 },
  { x: -20, w: 12, h: 19, fs: 0.8, o: 0 },
] as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Where card `index` sits when the deck has advanced by `t` steps: between two slots
 * while it moves up the deck, or sliding out to the right and fading once it has had
 * its turn.
 */
export function cardStyle(index: number, t: number): CSSProperties {
  const depth = index - t;
  const front = SLOTS[0];
  let slot: { x: number; w: number; h: number; fs: number; o: number };
  if (depth < 0) {
    const gone = Math.min(1, -depth);
    slot = { ...front, x: front.x + gone * 24, o: Math.max(0, 1 - gone * 1.4) };
  } else {
    const last = SLOTS.length - 1;
    const from = Math.min(last, Math.floor(depth));
    const to = Math.min(last, from + 1);
    const a = SLOTS[from] ?? front;
    const b = SLOTS[to] ?? front;
    const k = depth - Math.floor(depth);
    slot = {
      x: lerp(a.x, b.x, k),
      w: lerp(a.w, b.w, k),
      h: lerp(a.h, b.h, k),
      fs: lerp(a.fs, b.fs, k),
      o: lerp(a.o, b.o, k),
    };
  }
  return {
    '--x': slot.x.toFixed(3),
    '--w': slot.w.toFixed(3),
    '--h': slot.h.toFixed(3),
    '--fs': slot.fs.toFixed(3),
    '--o': slot.o.toFixed(3),
    // A card on its way out slips under the one taking its place.
    '--z': String(depth < 0 ? 1 : Math.round(100 - depth * 10)),
  } as CSSProperties;
}

/** Scroll progress through `track` (0 at its top, 1 when its end reaches the viewport's). */
function trackProgress(track: Element): number {
  const rect = track.getBoundingClientRect();
  const distance = rect.height - window.innerHeight;
  if (distance <= 0) return 0;
  return Math.min(1, Math.max(0, -rect.top / distance));
}

/** The deck's position for a scroll progress, with a short hold at both ends. */
const advance = (progress: number, count: number) =>
  Math.min(count - 1, Math.max(0, progress * (count - 0.5) - 0.25));

/** The card picture, or a gradient panel with the step's name when it has none. */
function CardImage({ step }: { readonly step: Step }) {
  if (step.image) {
    return (
      <StaticImage
        src={step.image.src}
        alt={step.image.alt}
        width={step.image.width}
        height={step.image.height}
        sizes="(min-width: 64rem) 60vw, (min-width: 48rem) 50vw, 100vw"
        className="size-full object-cover select-none"
      />
    );
  }
  return (
    <span className="grid size-full place-items-center bg-[linear-gradient(135deg,#1d1430,#0b0812)] font-hero-display text-[clamp(1.5rem,4cqw,3rem)] text-white/80 uppercase">
      {step.title}
    </span>
  );
}

/**
 * "Work Progress" (after the reference): the current step's card large on the right,
 * the next steps queued to its left, smaller and smaller, each named underneath; the
 * current step's name and summary sit at the top right and a rail on the right shows
 * how far along you are. While the section is pinned (large screens, motion allowed),
 * scrolling slides the front card out and moves every other card up a place, and the
 * page moves on once the last step is in front. Everywhere else the steps are a plain
 * list of cards with their summaries. The server HTML has the deck at the first step.
 */
export function WorkDeck({ steps }: WorkDeckProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const railRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const count = steps.length;
  const current = steps[active] ?? steps[0];

  useEffect(() => {
    const root = rootRef.current;
    const track = root?.closest('.process-track');
    if (!root || !track) return;
    const media = window.matchMedia(PINNED_QUERY);
    let frame = 0;

    const place = (t: number) => {
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        for (const [name, value] of Object.entries(cardStyle(index, t))) {
          card.style.setProperty(name, String(value));
        }
      });
      railRef.current?.style.setProperty('scale', `1 ${String(t / Math.max(1, count - 1))}`);
      setActive(Math.round(t));
    };
    const update = () => {
      frame = 0;
      place(advance(trackProgress(track), count));
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    const sync = () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      frame = 0;
      if (media.matches) {
        window.addEventListener('scroll', onScroll, { passive: true });
        update();
      } else {
        place(0);
      }
    };

    sync();
    media.addEventListener('change', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  return (
    <div ref={rootRef} className="work-progress relative">
      <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[1fr_minmax(0,32rem)]">
        <h2
          id="process-title"
          className="font-hero text-[clamp(2.25rem,3.4vw,3.25rem)] leading-[1.1] font-medium tracking-[-0.01em]"
        >
          Work Progress
        </h2>
        {/* The current step, for sighted users; the list below has every step's text. */}
        {current ? (
          <div aria-hidden="true" className="work-current hidden lg:block">
            <div key={active} className="work-current-text">
              <p className="font-hero text-lg font-medium">
                {current.title}
                <span className="ml-3 text-sm font-normal text-ink/60">{current.duration}</span>
              </p>
              <p className="mt-2 font-hero text-[0.95rem] leading-relaxed text-ink/70">
                {current.summary}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="work-stage mt-10 @container">
        <ol className="work-deck grid gap-x-6 gap-y-10 md:grid-cols-2">
          {steps.map((step, index) => (
            <li
              key={step.title}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              className="work-card"
              style={cardStyle(index, 0)}
            >
              <div className="work-card-frame aspect-[3/2] overflow-hidden rounded-[1.25rem] bg-ink shadow-[0_24px_60px_-20px_rgb(15_15_15/0.45)]">
                <CardImage step={step} />
              </div>
              <h3 className="work-card-label mt-4 font-hero text-lg font-medium whitespace-nowrap">
                {step.title}
              </h3>
              <p className="work-card-summary mt-1 font-hero text-ink/70">
                <span className="text-sm text-ink/60">{step.duration}. </span>
                {step.summary}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Progress rail: a dot per step, filling as the deck advances. */}
      <div aria-hidden="true" className="work-rail absolute top-1/2 hidden -translate-y-1/2">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/15" />
        <span
          ref={railRef}
          className="absolute inset-y-0 left-1/2 w-px origin-top -translate-x-1/2 bg-[#a855f7]"
          style={{ scale: '1 0' }}
        />
        <span className="relative flex flex-col gap-7">
          {steps.map((step, index) => (
            <span
              key={step.title}
              className={cx(
                'block size-2 rounded-full transition-[background-color,box-shadow] duration-300',
                index <= active ? 'bg-[#a855f7]' : 'bg-ink/25',
                index === active && 'shadow-[0_0_0_4px_rgb(168_85_247/0.2)]',
              )}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
