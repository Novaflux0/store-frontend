'use client';

import { cx } from '@agency/ui';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import type { TeamMemberData } from '@agency/validation';
import { StaticImage } from '@/components/media/StaticImage';

export interface TeamShowcaseMember {
  readonly name: string;
  readonly role: string;
  readonly photo?: TeamMemberData['photo'];
  readonly socials?: TeamMemberData['socials'];
}

export interface TeamShowcaseProps {
  readonly team: readonly TeamShowcaseMember[];
}

/** How long each member stays open while the row plays on its own. */
const AUTO_ADVANCE_MS = 4500;

const SOCIALS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['whatsapp', 'WhatsApp'],
] as const;

/**
 * The team as an accordion of portraits (Figma "About Us", 2112:1019): one member open
 * as a wide card with their name, role and profile links on a dark panel, the others
 * as tall pills. Hovering, focusing or clicking a pill opens it; the widths, corners
 * and panel ease into place. While the row is on screen and nobody is pointing at it,
 * it opens the next member every few seconds. Under reduced motion it changes without
 * easing and never plays on its own. Phones stack the cards, the open one tallest.
 */
export function TeamShowcase({ team }: TeamShowcaseProps) {
  const rootRef = useRef<HTMLUListElement>(null);
  // The Figma frame opens the third member.
  const [active, setActive] = useState(Math.min(2, team.length - 1));
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const count = team.length;

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
    if (!visible || paused || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => {
      setActive((index) => (index + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [visible, paused, active, count]);

  return (
    <ul
      ref={rootRef}
      aria-label="Our core team"
      className="team-showcase flex flex-col gap-4 md:h-[clamp(26rem,36vw,694px)] md:flex-row md:gap-8"
      onPointerEnter={() => {
        setPaused(true);
      }}
      onPointerLeave={() => {
        setPaused(false);
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      {team.map((member, index) => {
        const open = index === active;
        const links = SOCIALS.filter(([key]) => member.socials?.[key]);
        return (
          <li
            key={member.name}
            data-open={open ? '' : undefined}
            className={cx(
              'team-card group relative overflow-hidden bg-[#0f3d12] @container',
              open ? 'rounded-[48px]' : 'rounded-[131.5px]',
            )}
            style={{ '--grow': open ? 546 : 263 } as CSSProperties}
            onPointerEnter={() => {
              setActive(index);
            }}
          >
            {member.photo ? (
              <StaticImage
                src={member.photo.src}
                alt={member.photo.alt}
                width={member.photo.width}
                height={member.photo.height}
                sizes="(min-width: 48rem) 30vw, 100vw"
                className="absolute inset-0 size-full object-cover object-[50%_18%] transition-transform duration-700 ease-out group-data-open:scale-[1.02]"
              />
            ) : null}
            {/* Opens this member (keyboard and touch); the pointer opens it on hover. */}
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${member.name}, ${member.role}`}
              className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-[#21d300]"
              onClick={() => {
                setActive(index);
              }}
              onFocus={() => {
                setActive(index);
              }}
            />
            <div
              aria-hidden={!open}
              inert={!open}
              className="team-panel absolute inset-x-0 bottom-0 z-20 flex flex-col items-center rounded-2xl bg-black/57 px-6 pt-[37px] pb-[35px] text-center text-white"
            >
              <p className="w-full max-w-[418px] font-about-card text-[clamp(1.5rem,7.33cqw,2.5rem)] font-semibold">
                {member.name}
              </p>
              <p className="mt-3 w-full max-w-[418px] font-about-card text-[clamp(1rem,4.4cqw,1.5rem)]">
                {member.role}
              </p>
              {links.length > 0 ? (
                <ul className="mt-[35px] flex gap-[18.33px]">
                  {links.map(([key, label]) => (
                    <li key={key}>
                      <a
                        href={member.socials?.[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on ${label}`}
                        className="grid size-[55px] place-items-center rounded-[18.33px] bg-[rgb(249_250_251/0.21)] transition-colors hover:bg-[rgb(249_250_251/0.35)] focus-visible:outline-2 focus-visible:outline-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- static icon */}
                        <img
                          src={`/images/about/${key}.svg`}
                          alt=""
                          width={37}
                          height={37}
                          className="size-[36.67px]"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
