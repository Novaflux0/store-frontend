import { cx } from '@agency/ui';

import { aboutFontVariables } from './about-fonts';
import { TeamShowcase, type TeamShowcaseMember } from './TeamShowcase';

export interface AboutSnippetProps {
  readonly team: readonly TeamShowcaseMember[];
}

/**
 * About us (Figma "About Us", 2112:1019): "Our Core Team" over the heading, the team
 * accordion (`TeamShowcase`) below, and a soft green glow in the top right corner.
 * Renders only when there are team members.
 */
export function AboutSnippet({ team }: AboutSnippetProps) {
  if (team.length === 0) return null;
  return (
    <section
      aria-labelledby="about-title"
      className={cx(aboutFontVariables, 'relative overflow-clip bg-paper pt-[73px] pb-24 text-ink')}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-225px] right-[-197px] size-[450px] rounded-full bg-[#00ab0b] opacity-20 blur-[64px]"
      />
      <div className="relative flex flex-col items-center gap-[10.96px] px-4 text-center">
        <p className="flex items-center gap-[3px] font-about-label text-xl font-medium text-[#008e09]">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative icon */}
          <img
            src="/images/about/sparkle.svg"
            alt=""
            width={18}
            height={19}
            className="m-[3px] h-[19px] w-[18px]"
          />
          Our Core Team
        </p>
        <h2
          id="about-title"
          className="font-about-heading text-[clamp(2rem,3.4vw,3rem)] leading-[1.5] font-medium text-[#0f0f0f]"
        >
          The People <em className="font-bold text-[#008e09]">Behind the Vision</em>
        </h2>
      </div>
      <div className="relative mx-auto mt-[73px] max-w-[1431px] px-4 md:px-6">
        <TeamShowcase team={team} />
      </div>
    </section>
  );
}
