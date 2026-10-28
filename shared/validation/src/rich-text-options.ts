// Zod-free on purpose: re-exported by `@agency/validation/constants` so the admin
// editor can build its toolbar and the heading style controls without loading Zod.

const BLOCK_NODES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'image',
] as const;
const INLINE_NODES = ['text', 'hardBreak'] as const;

export const RICH_TEXT_BLOCK_NODES = BLOCK_NODES;
export const RICH_TEXT_INLINE_NODES = INLINE_NODES;
export const RICH_TEXT_NODE_TYPES = ['doc', 'listItem', ...BLOCK_NODES, ...INLINE_NODES] as const;
export type RichTextNodeType = (typeof RICH_TEXT_NODE_TYPES)[number];

export const RICH_TEXT_MARK_TYPES = ['bold', 'italic', 'strike', 'code', 'link'] as const;
export type RichTextMarkType = (typeof RICH_TEXT_MARK_TYPES)[number];

type RichTextAttrs = Record<string, string | number | boolean | null>;

// `| undefined` on the optional fields matches what Zod infers under
// `exactOptionalPropertyTypes`.
export interface RichTextMark {
  type: RichTextMarkType;
  attrs?: RichTextAttrs | undefined;
}

export interface RichTextNode {
  type: RichTextNodeType;
  attrs?: RichTextAttrs | undefined;
  content?: RichTextNode[] | undefined;
  text?: string | undefined;
  marks?: RichTextMark[] | undefined;
}

export interface RichTextDoc extends RichTextNode {
  type: 'doc';
}

/** Body heading levels. The page title is the only `<h1>`, so the body starts at H2. */
export const HEADING_LEVELS = [2, 3, 4, 5, 6] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

/**
 * Fonts an editor may give a heading. Both apps self-host each one with
 * `next/font` under `cssVar` (CSP `font-src 'self'`), so the list is fixed: a
 * font that is not loaded at build time could never be shown.
 */
export const HEADING_FONTS = {
  'space-grotesk': {
    label: 'Space Grotesk',
    cssVar: '--font-space-grotesk',
    fallback: 'system-ui, sans-serif',
  },
  inter: { label: 'Inter', cssVar: '--font-inter', fallback: 'system-ui, sans-serif' },
  montserrat: {
    label: 'Montserrat',
    cssVar: '--font-montserrat',
    fallback: 'system-ui, sans-serif',
  },
  'playfair-display': {
    label: 'Playfair Display',
    cssVar: '--font-playfair-display',
    fallback: 'Georgia, serif',
  },
  lora: { label: 'Lora', cssVar: '--font-lora', fallback: 'Georgia, serif' },
  'jetbrains-mono': {
    label: 'JetBrains Mono',
    cssVar: '--font-jetbrains-mono',
    fallback: 'ui-monospace, monospace',
  },
} as const satisfies Record<string, { label: string; cssVar: string; fallback: string }>;
export type HeadingFont = keyof typeof HEADING_FONTS;
export const HEADING_FONT_KEYS = Object.keys(HEADING_FONTS) as [HeadingFont, ...HeadingFont[]];

export const HEADING_FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;

export const HEADING_STYLE_LIMITS = {
  /** Font size in CSS pixels, rendered as rem so it follows the reader's text size. */
  fontSize: { min: 12, max: 96 },
  /** Unitless line height. */
  lineHeight: { min: 0.8, max: 2.5 },
} as const;

/** Per-heading style, as stored on the heading node. `null` keeps the site default. */
export interface HeadingStyleAttrs {
  fontFamily?: HeadingFont | null;
  fontSize?: number | null;
  fontWeight?: number | null;
  lineHeight?: number | null;
}

/**
 * The inline style of a heading (camelCase CSS properties, for React `style` and the
 * editor). Only values the schema accepts produce a declaration, so stored content
 * can never inject arbitrary CSS.
 */
export function headingStyle(attrs: RichTextNode['attrs']): Record<string, string> {
  const style: Record<string, string> = {};
  const family = attrs?.fontFamily;
  if (typeof family === 'string' && Object.hasOwn(HEADING_FONTS, family)) {
    const font = HEADING_FONTS[family as HeadingFont];
    style.fontFamily = `var(${font.cssVar}), '${font.label}', ${font.fallback}`;
  }
  const size = attrs?.fontSize;
  if (
    typeof size === 'number' &&
    size >= HEADING_STYLE_LIMITS.fontSize.min &&
    size <= HEADING_STYLE_LIMITS.fontSize.max
  ) {
    style.fontSize = `${String(size / 16)}rem`;
  }
  const weight = attrs?.fontWeight;
  if (typeof weight === 'number' && (HEADING_FONT_WEIGHTS as readonly number[]).includes(weight)) {
    style.fontWeight = String(weight);
  }
  const lineHeight = attrs?.lineHeight;
  if (
    typeof lineHeight === 'number' &&
    lineHeight >= HEADING_STYLE_LIMITS.lineHeight.min &&
    lineHeight <= HEADING_STYLE_LIMITS.lineHeight.max
  ) {
    style.lineHeight = String(lineHeight);
  }
  return style;
}

/**
 * Link relationships an editor may set (Google's qualifiers). The storefront always
 * adds `noopener noreferrer` to external links on top of these.
 */
export const LINK_REL_TOKENS = ['nofollow', 'sponsored', 'ugc'] as const;
export type LinkRelToken = (typeof LINK_REL_TOKENS)[number];

/** The editor's tokens from a stored `rel`; unknown tokens are dropped. */
export function linkRelTokens(rel: unknown): LinkRelToken[] {
  if (typeof rel !== 'string') return [];
  const tokens = new Set(rel.toLowerCase().split(/\s+/));
  return LINK_REL_TOKENS.filter((token) => tokens.has(token));
}
