// Zod-free: reads rich text without validating it. Shared by the storefront renderer
// (heading ids, table of contents), the admin editor (SEO analysis) and the API (link
// scanning), so all three agree on what a heading id or a link is.

import {
  type HeadingLevel,
  HEADING_LEVELS,
  type LinkRelToken,
  linkRelTokens,
  type RichTextNode,
} from './rich-text-options.js';

const TEXT_BLOCKS: ReadonlySet<RichTextNode['type']> = new Set([
  'paragraph',
  'heading',
  'codeBlock',
]);

/** Plain text of a document (search, excerpts, reading time). */
export function richTextToPlainText(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  const inner = (node.content ?? []).map(richTextToPlainText).join('');
  // Text blocks end a line; containers (lists, quotes) only join their children.
  return TEXT_BLOCKS.has(node.type) ? `${inner}\n` : inner;
}

/** The inline text of one node, without line breaks (heading text, link text). */
export function inlineText(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(inlineText).join('');
}

/** `"Why static pages?"` -> `why-static-pages`, for heading anchors. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export interface HeadingOutlineItem {
  level: HeadingLevel;
  text: string;
  /** Unique within the document: repeated headings get `-2`, `-3` ... */
  id: string;
  node: RichTextNode;
}

function headingLevel(node: RichTextNode): HeadingLevel {
  const level = node.attrs?.level;
  return (HEADING_LEVELS as readonly unknown[]).includes(level) ? (level as HeadingLevel) : 2;
}

/**
 * Every heading in document order with a unique anchor id. Headings inside quotes
 * are included, as they render as headings too. Empty headings are skipped.
 */
export function headingOutline(doc: RichTextNode): HeadingOutlineItem[] {
  const items: HeadingOutlineItem[] = [];
  const used = new Map<string, number>();
  const visit = (node: RichTextNode): void => {
    if (node.type === 'heading') {
      const text = inlineText(node).trim();
      if (text.length === 0) return;
      const base = slugifyHeading(text) || 'section';
      const count = (used.get(base) ?? 0) + 1;
      used.set(base, count);
      items.push({
        level: headingLevel(node),
        text,
        id: count === 1 ? base : `${base}-${String(count)}`,
        node,
      });
      return;
    }
    node.content?.forEach(visit);
  };
  visit(doc);
  return items;
}

export interface RichTextLink {
  href: string;
  text: string;
  internal: boolean;
  newTab: boolean;
  rel: LinkRelToken[];
}

/** Site paths and in-page anchors are internal; http(s) and mailto links are external. */
export function isInternalHref(href: string): boolean {
  return /^\/(?![/\\])/.test(href) || href.startsWith('#');
}

/** Every link in document order. Adjacent text nodes under the same link are merged. */
export function extractLinks(doc: RichTextNode): RichTextLink[] {
  const links: RichTextLink[] = [];
  let previous: RichTextLink | undefined;
  const visit = (node: RichTextNode): void => {
    if (node.type === 'text') {
      const mark = node.marks?.find((candidate) => candidate.type === 'link');
      const href = mark?.attrs?.href;
      if (mark === undefined || typeof href !== 'string') {
        previous = undefined;
        return;
      }
      if (previous?.href === href) {
        previous.text += node.text ?? '';
        return;
      }
      const link: RichTextLink = {
        href,
        text: node.text ?? '',
        internal: isInternalHref(href),
        newTab: mark.attrs?.target === '_blank',
        rel: linkRelTokens(mark.attrs?.rel),
      };
      links.push(link);
      previous = link;
      return;
    }
    previous = undefined;
    node.content?.forEach(visit);
    previous = undefined;
  };
  visit(doc);
  return links;
}

/** Words in a text: whitespace-separated tokens holding at least one letter or digit. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Average adult silent reading speed for non-fiction. */
export const READING_WORDS_PER_MINUTE = 220;

/** Whole minutes to read `words` words, at least one for any text. */
export function readingTimeMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / READING_WORDS_PER_MINUTE));
}
