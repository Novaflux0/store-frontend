import { JetBrains_Mono, Lora, Montserrat, Playfair_Display } from 'next/font/google';

// The extra fonts an editor can give a heading (HEADING_FONTS in @agency/validation;
// Inter and Space Grotesk are the app's own fonts, loaded in the root layout). Each is a
// variable font self-hosted by next/font (CSP font-src 'self'). Not preloaded: the
// files download only on pages whose headings use them.
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-montserrat',
});
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-playfair-display',
});
const lora = Lora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-lora' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-jetbrains-mono',
});

/** Class names that define the heading font CSS variables; set on `<html>`. */
export const headingFontVariables = [montserrat, playfairDisplay, lora, jetbrainsMono]
  .map((font) => font.variable)
  .join(' ');
