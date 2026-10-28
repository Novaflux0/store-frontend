/**
 * "Design with purpose. Build with impact." -> accent "Design", rest "with purpose.",
 * second "Build with impact.": the first word (set in the accent serif), the rest of
 * the first sentence, and everything after it (the second line).
 */
export function splitHeadline(headline: string): {
  readonly accent: string;
  readonly rest: string;
  readonly second: string;
} {
  const [first = '', ...more] = headline.trim().split(/(?<=[.!?])\s+/);
  const [accent = '', ...rest] = first.split(/\s+/);
  return { accent, rest: rest.join(' '), second: more.join(' ') };
}
