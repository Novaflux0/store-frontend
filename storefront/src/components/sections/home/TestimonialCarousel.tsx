'use client';

import { cx } from '@agency/ui';
import { useEffect, useRef, useState } from 'react';

import type { TestimonialData } from '@agency/validation';
import { StaticImage } from '@/components/media/StaticImage';

export interface TestimonialCarouselProps {
  readonly testimonials: readonly TestimonialData[];
}

type Testimonial = TestimonialData;

/** How long each review shows while the carousel plays on its own. */
const AUTO_ADVANCE_MS = 5000;

/** The Figma star (Frame 2147227624), one per point of the rating. */
const STAR =
  'M6.6 1.23c.13-.39.67-.39.8 0l1.08 3.32c.06.17.22.29.4.29h3.49c.4 0 .57.52.25.76L9.79 7.65a.42.42 0 0 0-.15.47l1.08 3.31c.12.39-.32.71-.65.47L7.25 9.85a.42.42 0 0 0-.5 0L3.93 11.9c-.33.24-.77-.08-.65-.47l1.08-3.31a.42.42 0 0 0-.15-.47L1.39 5.6c-.33-.24-.16-.76.25-.76h3.49c.18 0 .34-.12.4-.29z';

function Stars({ rating }: { readonly rating: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 70 14" className="h-3.5 w-[70px]">
      {[0, 1, 2, 3, 4].map((index) => (
        <path
          key={index}
          d={STAR}
          transform={`translate(${String(index * 14)} 0)`}
          fill={index < Math.round(rating) ? '#EBD244' : '#E5E5E5'}
        />
      ))}
    </svg>
  );
}

/** "Grade" over the rating and its stars. */
function Grade({ rating, large = false }: { readonly rating: number; readonly large?: boolean }) {
  return (
    <div className="w-[98px] shrink-0 font-hero leading-[1.64] font-medium text-ink [font-variation-settings:'opsz'_14]">
      <p className={large ? 'text-lg' : 'text-base'}>Grade</p>
      <p className="flex items-center gap-1">
        <span className={large ? 'text-lg' : 'text-base'}>{rating.toFixed(1)}</span>
        <Stars rating={rating} />
        <span className="sr-only">out of 5</span>
      </p>
    </div>
  );
}

/** "Steve Zee. Founder" over the company. */
function Byline({
  testimonial,
  size,
  light = false,
}: {
  readonly testimonial: Testimonial;
  readonly size: 'sm' | 'lg';
  readonly light?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 font-hero leading-[1.64] [font-variation-settings:'opsz'_14] [word-break:break-word]">
      <p
        className={cx(
          'font-medium capitalize',
          size === 'lg' ? 'text-2xl' : 'text-xl',
          light ? 'text-white' : 'text-ink',
        )}
      >
        {testimonial.author}. {testimonial.role}
      </p>
      <p
        className={cx(
          size === 'lg' ? 'text-lg' : 'text-sm',
          light ? 'text-white/70' : 'text-[#7c7c7c]',
        )}
      >
        {testimonial.company}
      </p>
    </div>
  );
}

/** A testimonial's portrait, or its initials on grey when it has none. */
function Portrait({
  testimonial,
  sizes,
  className,
}: {
  readonly testimonial: Testimonial;
  readonly sizes: string;
  readonly className?: string;
}) {
  if (!testimonial.photo) {
    return (
      <span
        className={cx(
          'grid place-items-center bg-[#e9e9e9] font-hero-display text-ink/40 uppercase',
          className,
        )}
      >
        {testimonial.author.charAt(0)}
      </span>
    );
  }
  return (
    <StaticImage
      src={testimonial.photo.src}
      alt=""
      width={testimonial.photo.width}
      height={testimonial.photo.height}
      sizes={sizes}
      className={cx('object-cover', className)}
    />
  );
}

/** The round arrow buttons: black back, green forward (the same chevron, mirrored). */
function Arrow({
  direction,
  onClick,
  className,
}: {
  readonly direction: 'previous' | 'next';
  readonly onClick: () => void;
  readonly className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'previous' ? 'Previous review' : 'Next review'}
      className={cx(
        'grid size-[58px] shrink-0 place-items-center rounded-[29px] transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink',
        direction === 'previous' ? 'bg-ink' : 'bg-[#21d300]',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 24px static icon */}
      <img
        src="/images/testimonials/chevron.svg"
        alt=""
        width={24}
        height={24}
        className={cx('size-6', direction === 'next' && '-scale-x-100')}
      />
    </button>
  );
}

/** The quote: the first letter larger, every word capitalised (as in the design). */
function Quote({ testimonial }: { readonly testimonial: Testimonial }) {
  return (
    <blockquote className="font-hero text-xl leading-[1.64] font-medium text-ink capitalize [font-variation-settings:'opsz'_14] [word-break:break-word] first-letter:text-[32px]">
      <p>{testimonial.quote}”</p>
    </blockquote>
  );
}

/**
 * The reviews carousel (Figma "Testimonials", 2107:794). From wide screens: the
 * previous review as a small card under a back button, the current one's portrait,
 * quote and byline with a forward button, and the next review as a photo card at the
 * top right, over a large faint quote mark. Narrower screens show the current review
 * with both buttons. Changing review fades the new content in. While on screen it
 * moves to the next review every few seconds, pausing while the pointer or keyboard
 * focus is on it (and never under reduced motion); the quote is announced only when a
 * visitor changes it, not on every automatic turn.
 */
export function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const count = testimonials.length;
  const playing = visible && !hovered && !focused && count > 1;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry?.isIntersecting ?? false);
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Restarts after every change, so a click never leads straight into an auto turn.
    const timer = window.setTimeout(() => {
      setIndex((value) => (value + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [playing, index, count]);

  const current = testimonials[index];
  if (!current) return null;
  const previous = testimonials[(index - 1 + count) % count] ?? current;
  const next = testimonials[(index + 1) % count] ?? current;
  const many = count > 1;
  const go = (step: number) => {
    setIndex((value) => (value + step + count) % count);
  };
  const rating = (testimonial: Testimonial) => testimonial.rating ?? 5;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Reviews"
      className="relative xl:h-[588px]"
      onPointerEnter={() => {
        setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      {/* The faint quote mark behind the right half. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-2 right-0 hidden h-[380px] w-[476px] rotate-180 overflow-clip opacity-30 xl:block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative vector */}
        <img
          src="/images/testimonials/quote-mark.svg"
          alt=""
          className="absolute top-[3.92%] left-[-7.65%] max-w-none"
          style={{ width: '107.74%', height: '126.89%' }}
        />
      </div>

      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-6 xl:h-full xl:grid-cols-[392fr_392fr_505fr_299fr]">
        {/* Previous review: a back button over a small card. */}
        <div className="relative hidden xl:block">
          {many ? (
            <>
              <Arrow
                direction="previous"
                onClick={() => {
                  go(-1);
                }}
                className="absolute top-0 right-[31.5px]"
              />
              <div
                key={`previous-${String(index)}`}
                className="testimonial-in absolute right-0 bottom-0 left-0 flex flex-col gap-4 rounded-[32px] border border-[#f0f0f0] bg-white p-6"
              >
                <Portrait
                  testimonial={previous}
                  sizes="60px"
                  className="size-[60px] rounded-full text-xl"
                />
                <div className="flex items-center justify-between gap-4">
                  <div className="w-[179px]">
                    <Byline testimonial={previous} size="sm" />
                  </div>
                  <Grade rating={rating(previous)} />
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Current review's portrait. */}
        <div
          key={`photo-${String(index)}`}
          className="testimonial-in relative aspect-[392/588] max-h-[588px] w-full max-w-[392px] overflow-hidden rounded-[32px] xl:aspect-auto xl:h-full xl:max-w-none"
        >
          <Portrait
            testimonial={current}
            sizes="(min-width: 80rem) 24vw, 392px"
            className="size-full text-[96px]"
          />
        </div>

        {/* Current review: quote, byline and the forward button. */}
        <div className="relative flex flex-col gap-8 xl:block">
          <div
            key={`quote-${String(index)}`}
            aria-live={playing ? 'off' : 'polite'}
            className="testimonial-in xl:-mt-[5px]"
          >
            <Quote testimonial={current} />
          </div>
          <div className="flex flex-wrap items-end gap-6 xl:absolute xl:bottom-0 xl:left-0 xl:z-10 xl:w-max xl:flex-nowrap xl:gap-14">
            <div
              key={`byline-${String(index)}`}
              className="testimonial-in flex w-full max-w-[464px] flex-col gap-[22px]"
            >
              <span aria-hidden="true" className="block h-px w-full bg-[#f0f0f0]" />
              <div className="flex items-center gap-6 xl:gap-[71px]">
                <div className="min-w-0 flex-1 xl:w-[224px] xl:flex-none">
                  <Byline testimonial={current} size="lg" />
                </div>
                <span aria-hidden="true" className="h-[51.5px] w-px shrink-0 bg-[#f0f0f0]" />
                <Grade rating={rating(current)} large />
              </div>
            </div>
            {many ? (
              <div className="flex shrink-0 gap-3">
                <Arrow
                  direction="previous"
                  onClick={() => {
                    go(-1);
                  }}
                  className="xl:hidden"
                />
                <Arrow
                  direction="next"
                  onClick={() => {
                    go(1);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Next review: a photo card with its byline. */}
        <div className="relative hidden xl:block">
          {many ? (
            <div
              key={`next-${String(index)}`}
              className="testimonial-in relative h-[198px] overflow-hidden rounded-[32px]"
            >
              <Portrait
                testimonial={next}
                sizes="(min-width: 80rem) 18vw, 299px"
                className="absolute inset-0 size-full object-[50%_20%] text-5xl"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(255_255_255/0)_30.556%,rgb(1_1_1/0.58))]"
              />
              <div className="absolute bottom-4 left-4 w-[179px]">
                <Byline testimonial={next} size="sm" light />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
