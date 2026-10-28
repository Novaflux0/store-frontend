'use client';

import { useEffect } from 'react';

import { cx } from '@agency/ui';

import { useTheme } from '@/hooks/useTheme';
import { applyTheme, readTheme } from '@/lib/theme';

import { MoonIcon, SunIcon } from './NavIcons';

export interface ThemeToggleProps {
  /** `icon`: square icon button in the desktop bar. `menu`: labelled row in the "More" menu. */
  readonly variant: 'icon' | 'menu';
  readonly className?: string;
}

/**
 * Switches between the dark (default) and light theme and remembers the choice.
 * Both icons are rendered and CSS picks one from `data-theme`, so a stored light
 * theme shows the right icon before hydration; only the label waits for React.
 */
export function ThemeToggle({ variant, className }: ThemeToggleProps) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  // The head script can run before Next.js inserts <meta name="theme-color">; re-apply
  // once mounted so the browser UI colour matches a stored light theme.
  useEffect(() => {
    const root = document.documentElement;
    applyTheme(root, readTheme(root));
  }, []);

  const label = `Switch to ${next} theme`;
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
      }}
      aria-label={variant === 'icon' ? label : undefined}
      className={cx(
        'items-center text-nav-fg transition-colors hover:bg-nav-fg/10',
        variant === 'icon'
          ? 'size-12 justify-center rounded-xl'
          : 'flex min-h-11 w-full gap-3 rounded-lg px-4 text-left text-sm',
        className,
      )}
    >
      <SunIcon className="size-5 light:hidden" />
      <MoonIcon className="hidden size-5 light:block" />
      {variant === 'menu' ? <span>{label}</span> : null}
    </button>
  );
}
