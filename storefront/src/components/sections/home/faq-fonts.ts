import { Plus_Jakarta_Sans } from 'next/font/google';

// The FAQ design's figure tiles use Plus Jakarta Sans; the rest of the section shares
// the About Us fonts (about-fonts.ts). `@theme inline` in globals.css turns the
// variable into the font-faq-stat class.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: '600',
  display: 'swap',
  variable: '--font-jakarta',
});

/** Class name that defines the section's font variable. */
export const faqFontVariables = jakarta.variable;
