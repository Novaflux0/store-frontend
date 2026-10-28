/**
 * Light and dark themes. Dark is the default: no attribute on <html> means dark, and
 * `data-theme="light"` switches every colour token in globals.css. The visitor's
 * choice lives in localStorage only (no cookie), so marketing pages stay static.
 */

export type Theme = 'dark' | 'light';

export const DEFAULT_THEME: Theme = 'dark';
export const THEME_STORAGE_KEY = 'theme';
export const THEME_ATTRIBUTE = 'data-theme';

/** Browser UI colour (`<meta name="theme-color">`) per theme: the page background. */
export const THEME_COLOR: Readonly<Record<Theme, string>> = {
  dark: '#05060a',
  light: '#f6f7fb',
};

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

/** Stored choice, or the default when nothing (or something invalid) is stored. */
export function parseStoredTheme(value: string | null | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

/** Sets the attribute and browser UI colour for `theme` on `root`. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  if (theme === DEFAULT_THEME) root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, theme);
  root.ownerDocument
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme]);
}

/** Current theme from the DOM (the attribute set by the head script or the toggle). */
export function readTheme(root: HTMLElement): Theme {
  return root.getAttribute(THEME_ATTRIBUTE) === 'light' ? 'light' : DEFAULT_THEME;
}

/**
 * Inline <head> script: applies a stored light theme before first paint, so a light
 * visitor never sees a dark flash. Self-contained (it runs before any bundle loads)
 * and wrapped in try/catch because storage can throw (privacy modes, blocked
 * storage). The root layout gives it the request's CSP nonce.
 */
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})===${JSON.stringify('light')}){var d=document.documentElement;d.setAttribute(${JSON.stringify(
  THEME_ATTRIBUTE,
)},"light");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(
  THEME_COLOR.light,
)})}}catch(e){}})()`;
