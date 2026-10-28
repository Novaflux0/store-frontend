import { Outfit, Playfair_Display, Red_Hat_Display } from 'next/font/google';

// The fonts of the "Why choose us" design: Outfit for text, Red Hat Display for
// headings and Playfair Display italic for the accent words. Imported by that section
// only, so next/font preloads them on the home page and nowhere else; `@theme inline`
// in globals.css turns the variables into font-why-* classes.
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-outfit' });
const redHat = Red_Hat_Display({
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
  variable: '--font-red-hat',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: '700',
  style: 'italic',
  display: 'swap',
  variable: '--font-playfair',
});

/** Class names that define the section's font variables. */
export const whyFontVariables = [outfit.variable, redHat.variable, playfair.variable].join(' ');
