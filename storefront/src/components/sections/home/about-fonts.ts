import { Inter, Public_Sans, Rubik } from 'next/font/google';

// The fonts of the Figma "About Us" (team) design: Rubik for the heading, Public Sans
// for the label over it and Inter on the team cards. Imported by that section only;
// `@theme inline` in globals.css turns the variables into font-about-* classes.
const rubik = Rubik({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-rubik',
});
const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: '500',
  display: 'swap',
  variable: '--font-public-sans',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-inter',
});

/** Class names that define the section's font variables. */
export const aboutFontVariables = [rubik.variable, publicSans.variable, inter.variable].join(' ');
