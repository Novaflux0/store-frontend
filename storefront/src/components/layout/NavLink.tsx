'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cx } from '@agency/ui';

export interface NavLinkProps {
  /** A site path from the navigation settings (or a full URL). */
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Whether `pathname` is `href` or a page below it. */
export function isCurrentSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navigation link that marks the current section with `aria-current="page"`.
 * Callers style it (including the current state via `aria-[current=page]:`).
 */
export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname();
  return (
    <Link
      href={href as Route}
      aria-current={isCurrentSection(pathname, href) ? 'page' : undefined}
      className={cx('transition-colors', className)}
    >
      {children}
    </Link>
  );
}
