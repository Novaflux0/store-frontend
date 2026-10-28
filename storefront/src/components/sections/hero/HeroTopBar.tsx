import type { ContentLink } from '@agency/validation';
import type { Route } from 'next';
import Link from 'next/link';

import { OUTLINE_BUTTON } from './OutlineGlow';

export interface HeroTopBarProps {
  readonly siteName: string;
  /** Navigation settings `header`; without links the bar shows the brand and `cta` only. */
  readonly links: readonly ContentLink[];
  readonly cta: ContentLink;
}

/**
 * The home page's top bar from the hero design: brand, a pill of links (the home link
 * marked as the current page) and the call to action. It scrolls away with the hero;
 * the fixed bottom navigation stays the site-wide menu, so phones get only the brand
 * and the call to action here. The rims are inset rings, so they add no height.
 */
export function HeroTopBar({ siteName, links, cta }: HeroTopBarProps) {
  return (
    // From laptop width a 1fr / auto / 1fr grid centres the pill whatever the brand's width.
    <header
      data-fade-in=""
      className="flex w-full items-start justify-between gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr]"
    >
      {/* On the design's light corner from laptop width, on the dark background below it. */}
      <Link
        href="/"
        className="justify-self-start font-hero text-[2.25rem] leading-[0.77] font-normal tracking-[-0.01em] text-white lg:text-black"
      >
        {siteName}
      </Link>
      {links.length > 0 ? (
        <nav aria-label="Home page" className="max-lg:hidden">
          <ul className="flex items-center gap-8 rounded-[59px] px-[14px] py-[13px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.3)] 2xl:gap-[45px]">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href as Route}
                  aria-current={link.href === '/' ? 'page' : undefined}
                  className="block rounded-[31px] font-hero text-[18px] leading-[1.64] font-normal whitespace-nowrap text-white [font-variation-settings:'opsz'_14] transition-colors hover:text-[#c4ff79] aria-[current=page]:bg-[rgb(5_180_113/0.18)] aria-[current=page]:px-[17px] aria-[current=page]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] aria-[current=page]:hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <Link
        href={cta.href as Route}
        className={`${OUTLINE_BUTTON} h-[56px] justify-self-end text-[18px] font-normal lg:col-start-3`}
      >
        {cta.label}
      </Link>
    </header>
  );
}
