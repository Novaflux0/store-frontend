import { DM_Sans, Vollkorn } from 'next/font/google';

// The fonts of the Figma home page design. Imported by home page sections only (the
// hero, TrustedBy), so next/font preloads them on the home page and nowhere else. The
// variables are set on each of those sections; `@theme inline` in globals.css turns
// them into font-hero-* classes.
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  // The design pins the optical size to 14 (font-variation-settings), so the axis is needed.
  axes: ['opsz'],
  variable: '--font-dm-sans',
});
// The accent word of the headline only.
const vollkorn = Vollkorn({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-vollkorn',
});

/** Class names that define the hero font variables; set on the hero section. */
export const heroFontVariables = [dmSans.variable, vollkorn.variable].join(' ');
