import { runInNewContext } from 'node:vm';

import { afterEach, describe, expect, it } from 'vitest';

import {
  THEME_ATTRIBUTE,
  THEME_COLOR,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  isTheme,
  parseStoredTheme,
  readTheme,
} from './theme';

const root = () => document.documentElement;

function addThemeColorMeta(): HTMLMetaElement {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = THEME_COLOR.dark;
  document.head.append(meta);
  return meta;
}

afterEach(() => {
  root().removeAttribute(THEME_ATTRIBUTE);
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.remove();
  });
  localStorage.clear();
});

describe('theme', () => {
  it('accepts only known themes', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('sepia')).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it('defaults to dark for missing or invalid stored values', () => {
    expect(parseStoredTheme(null)).toBe('dark');
    expect(parseStoredTheme(undefined)).toBe('dark');
    expect(parseStoredTheme('LIGHT')).toBe('dark');
    expect(parseStoredTheme('light')).toBe('light');
  });

  it('sets the attribute and browser colour for light, and removes them for dark', () => {
    const meta = addThemeColorMeta();

    applyTheme(root(), 'light');
    expect(root().getAttribute(THEME_ATTRIBUTE)).toBe('light');
    expect(readTheme(root())).toBe('light');
    expect(meta.content).toBe(THEME_COLOR.light);

    applyTheme(root(), 'dark');
    expect(root().hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    expect(readTheme(root())).toBe('dark');
    expect(meta.content).toBe(THEME_COLOR.dark);
  });

  it('works when the page has no theme-color meta tag', () => {
    expect(() => {
      applyTheme(root(), 'light');
    }).not.toThrow();
    expect(readTheme(root())).toBe('light');
  });

  describe('head script', () => {
    /** Runs the exact inline text with the page's globals, like the browser does. */
    const run = (globals: object = { document, localStorage }) => {
      runInNewContext(THEME_SCRIPT, globals);
    };

    it('applies a stored light theme before paint', () => {
      const meta = addThemeColorMeta();
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      run();
      expect(readTheme(root())).toBe('light');
      expect(meta.content).toBe(THEME_COLOR.light);
    });

    it('leaves the default dark theme alone', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      run();
      expect(root().hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    });

    it('never throws when storage is unavailable', () => {
      const blocked = Object.defineProperty({ document }, 'localStorage', {
        get() {
          throw new Error('blocked');
        },
      });
      expect(() => {
        run(blocked);
      }).not.toThrow();
      expect(readTheme(root())).toBe('dark');
    });
  });
});
