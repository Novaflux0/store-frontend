'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

import { cx } from '@agency/ui';

import type { NavItem } from '@/lib/site';

import { ChevronUpIcon, MoreIcon } from './NavIcons';
import { NavLink, isCurrentSection } from './NavLink';

export interface MoreMenuProps {
  readonly items: readonly NavItem[];
  /** Classes for the summary, shared with the other bar items. */
  readonly itemClassName: string;
  /** Extra row after the links (the theme toggle on phones). */
  readonly footer?: ReactNode;
}

/**
 * "More" in the bottom bar: a native <details> disclosure (works without JavaScript)
 * that opens upward. JavaScript adds what <details> lacks: it closes after
 * navigation, on a click outside and on Escape (returning focus to the toggle).
 */
export function MoreMenu({ items, itemClassName, footer }: MoreMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const inMenu = items.some((item) => isCurrentSection(pathname, item.href));

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && !details.contains(event.target as Node)) details.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return;
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="group relative h-full">
      <summary
        data-current={inMenu ? '' : undefined}
        className={cx(itemClassName, 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}
      >
        <MoreIcon className="size-5 md:hidden" />
        <span>More</span>
        <ChevronUpIcon className="hidden size-4 transition-transform group-open:rotate-180 md:block" />
      </summary>
      <ul className="absolute right-0 bottom-full mb-11 flex w-56 flex-col rounded-xl border border-nav-edge bg-nav p-2 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)] md:right-1/2 md:mb-5 md:translate-x-1/2">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              className="flex min-h-11 items-center rounded-lg px-4 text-sm text-nav-fg hover:bg-nav-fg/10 aria-[current=page]:bg-nav-fg/10 aria-[current=page]:text-nav-focus"
            >
              {item.label}
            </NavLink>
          </li>
        ))}
        {footer}
      </ul>
    </details>
  );
}
