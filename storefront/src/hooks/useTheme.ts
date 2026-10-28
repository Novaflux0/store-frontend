'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  applyTheme,
  readTheme,
  type Theme,
} from '@/lib/theme';

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: [THEME_ATTRIBUTE] });
  return () => {
    observer.disconnect();
  };
}

function getSnapshot(): Theme {
  return readTheme(document.documentElement);
}

/**
 * Current theme and a setter. The server snapshot is the default (dark), so server
 * HTML and hydration agree; a stored light theme is already on <html> from the head
 * script, and the hook picks it up right after hydration.
 */
export function useTheme(): readonly [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_THEME);
  const setTheme = useCallback((next: Theme) => {
    applyTheme(document.documentElement, next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies to this page view.
    }
  }, []);
  return [theme, setTheme] as const;
}
