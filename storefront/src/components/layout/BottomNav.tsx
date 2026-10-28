import type { NavigationSettings } from '@agency/validation';
import type { Route } from 'next';
import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';

import type { NavItem } from '@/lib/site';

import { GooeyHighlight } from './GooeyHighlight';
import { MoreMenu } from './MoreMenu';
import { ArrowRightIcon, ChatIcon, PricingIcon, ProjectsIcon, ServicesIcon } from './NavIcons';
import { NavLink } from './NavLink';
import { ThemeToggle } from './ThemeToggle';

const ICONS: Readonly<Record<string, ComponentType<SVGProps<SVGSVGElement>>>> = {
  '/portfolio': ProjectsIcon,
  '/services': ServicesIcon,
  '/pricing': PricingIcon,
};

/**
 * Phones: icon over a small label in a full-width tab bar. Desktop: a text pill.
 * The bar is dark in both themes, so items use the nav-* tokens.
 */
const ITEM =
  'flex h-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.6875rem] font-medium whitespace-nowrap text-nav-fg ' +
  'max-md:hover:bg-nav-fg/10 aria-[current=page]:text-nav-focus data-current:text-nav-focus ' +
  'md:min-h-12 md:flex-row md:gap-1.5 md:px-6 md:font-display md:text-[0.9375rem] ' +
  // Desktop: the current/hover pill is drawn by GooeyHighlight behind the items.
  'md:aria-[current=page]:text-nav-fg md:data-current:text-nav-fg';

function BarLink({ item }: { readonly item: NavItem }) {
  const Icon = ICONS[item.href];
  return (
    <li data-gooey="">
      <NavLink href={item.href} className={ITEM}>
        {Icon ? <Icon className="size-5 md:hidden" /> : null}
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}

/**
 * Main navigation, fixed to the bottom of the viewport on every page: a centred
 * floating pill from `md` up (the reference design), and a full-width tab bar on
 * phones with the call to action raised in a notch. One landmark for both layouts.
 * The theme toggle ends the pill on desktop and sits in "More" on phones.
 */
export function BottomNav({ navigation }: { readonly navigation: NavigationSettings }) {
  // Phones: one column per link, the call to action and "More".
  const columns = navigation.start.length + navigation.end.length + 2;
  return (
    <nav
      aria-label="Main"
      className="nav-inverse fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2"
    >
      {/* Background layer, separate from the list so the notch mask cannot clip the raised button. */}
      <div aria-hidden="true" className="absolute inset-0 max-md:nav-glow">
        <div className="size-full rounded-t-[1.75rem] bg-nav max-md:nav-notch md:relative md:rounded-2xl md:border md:border-nav-edge md:shadow-[0_0_28px_-6px_var(--color-nav-edge),0_16px_40px_-16px_rgb(0_0_0/0.7)] md:rim-light" />
      </div>
      {/* Desktop: gooey pill behind the current item; flows to the new one on navigation. */}
      <GooeyHighlight />
      <ul
        style={{ gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))` }}
        className="relative grid h-16 px-1 pb-[env(safe-area-inset-bottom)] md:flex md:h-auto md:items-center md:gap-1 md:p-2"
      >
        {navigation.start.map((item) => (
          <BarLink key={item.href} item={item} />
        ))}
        <li className="flex justify-center md:block">
          <Link
            href={navigation.cta.href as Route}
            className="group/cta flex size-14 -translate-y-1/2 items-center justify-center rounded-2xl whitespace-nowrap bg-linear-to-br from-cta to-cta-deep font-display text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_10px_24px_-8px_var(--color-cta)] transition-[filter] hover:brightness-110 md:h-auto md:min-h-12 md:w-auto md:translate-y-0 md:gap-2.5 md:rounded-xl md:px-8 md:text-[0.9375rem] md:font-semibold"
          >
            <ChatIcon className="size-7 md:hidden" />
            <span className="max-md:sr-only">{navigation.cta.label}</span>
            <ArrowRightIcon className="hidden size-5 transition-transform group-hover/cta:translate-x-0.5 md:block" />
          </Link>
        </li>
        {navigation.end.map((item) => (
          <BarLink key={item.href} item={item} />
        ))}
        <li data-gooey="">
          <MoreMenu
            items={navigation.more}
            itemClassName={ITEM}
            footer={
              // Phones: in the menu, so the tab bar keeps five columns with the CTA centred.
              <li className="mt-1 border-t border-nav-fg/15 pt-1 md:hidden">
                <ThemeToggle variant="menu" />
              </li>
            }
          />
        </li>
        <li className="hidden md:flex md:items-center md:border-l md:border-nav-fg/15 md:pl-1">
          <ThemeToggle variant="icon" className="flex" />
        </li>
      </ul>
    </nav>
  );
}
