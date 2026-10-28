import { describe, expect, it } from 'vitest';

import { headingStyle, LINK_REL_TOKENS, type RichTextNode } from './rich-text-options.js';
import {
  countWords,
  extractLinks,
  headingOutline,
  readingTimeMinutes,
  richTextToPlainText,
} from './rich-text-utils.js';
import { EMPTY_RICH_TEXT, RICH_TEXT_LIMITS, richTextDocSchema } from './rich-text.js';

const text = (value: string, marks?: RichTextNode['marks']): RichTextNode =>
  marks === undefined ? { type: 'text', text: value } : { type: 'text', text: value, marks };
const paragraph = (...content: RichTextNode[]): RichTextNode => ({ type: 'paragraph', content });
const doc = (...content: RichTextNode[]): RichTextNode => ({ type: 'doc', content });

function messages(input: unknown): string[] {
  const result = richTextDocSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('richTextDocSchema', () => {
  it('accepts a typical article', () => {
    const article = doc(
      { type: 'heading', attrs: { level: 2 }, content: [text('Why it matters')] },
      paragraph(
        text('Read the '),
        text('guide', [
          { type: 'link', attrs: { href: '/blog/guide', target: null, rel: null, class: null } },
        ]),
        { type: 'hardBreak' },
        text('bold', [{ type: 'bold' }, { type: 'italic' }]),
      ),
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [paragraph(text('One'))] }],
      },
      {
        type: 'orderedList',
        attrs: { start: 3 },
        content: [{ type: 'listItem', content: [paragraph(text('Two'))] }],
      },
      { type: 'blockquote', content: [paragraph(text('Quote'))] },
      { type: 'codeBlock', attrs: { language: 'ts' }, content: [text('const a = 1;')] },
      { type: 'horizontalRule' },
      {
        type: 'image',
        attrs: { src: 'https://media.example.com/a.webp', alt: 'Diagram', width: 800, height: 600 },
      },
    );
    expect(messages(article)).toEqual([]);
    expect(richTextDocSchema.parse(EMPTY_RICH_TEXT)).toEqual(EMPTY_RICH_TEXT);
  });

  it('rejects a root that is not doc', () => {
    expect(messages(paragraph(text('x')))).toContain('The document root must be doc.');
  });

  it('rejects unknown node and mark types (no HTML, no iframes)', () => {
    expect(
      messages(doc({ type: 'html', text: '<script>' } as unknown as RichTextNode)),
    ).not.toEqual([]);
    expect(messages(doc(paragraph(text('x', [{ type: 'underline' } as never]))))).not.toEqual([]);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.example',
    'vbscript:x',
    '/\\evil.example',
    '/path\\..\\x',
  ])('rejects the link %j', (href) => {
    const input = doc(paragraph(text('x', [{ type: 'link', attrs: { href } }])));
    expect(messages(input)).toContain('Links must use https, mailto or a site path.');
  });

  it.each([
    'https://example.com/a',
    'http://example.com',
    'mailto:hi@example.com',
    '/contact',
    '#faq',
  ])('accepts the link %j', (href) => {
    expect(messages(doc(paragraph(text('x', [{ type: 'link', attrs: { href } }]))))).toEqual([]);
  });

  it('rejects images without alt text or with an unsafe source', () => {
    expect(messages(doc({ type: 'image', attrs: { src: '/a.png', alt: ' ' } }))).toContain(
      'Every image needs alt text.',
    );
    expect(
      messages(doc({ type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'a' } })),
    ).toContain('Images must come from the media library.');
  });

  it('enforces the structure', () => {
    expect(messages(doc(text('loose text')))).toContain('text is not allowed inside doc.');
    expect(messages(doc({ type: 'bulletList', content: [paragraph(text('x'))] }))).toContain(
      'paragraph is not allowed inside bulletList.',
    );
    expect(messages(doc({ type: 'paragraph', text: 'x' }))).toContain(
      'paragraph cannot hold text or marks directly.',
    );
    expect(messages(doc(paragraph({ type: 'text', text: '' })))).toContain(
      'Text nodes must not be empty.',
    );
    expect(
      messages(doc({ type: 'codeBlock', content: [text('x', [{ type: 'bold' }])] })),
    ).toContain('Code blocks take no formatting.');
  });

  it('checks attributes', () => {
    expect(
      messages(doc({ type: 'heading', attrs: { level: 1 }, content: [text('H1')] })),
    ).toContain('Use a heading from H2 to H6.');
    expect(
      messages(doc({ type: 'heading', attrs: { level: 7 }, content: [text('H7')] })),
    ).toContain('Use a heading from H2 to H6.');
    expect(messages(doc({ type: 'paragraph', attrs: { style: 'color:red' } }))).toContain(
      'paragraph takes no attributes.',
    );
  });

  it('accepts H2 to H6 with a style from the allowlist', () => {
    const styled = {
      level: 5,
      fontFamily: 'playfair-display',
      fontSize: 28,
      fontWeight: 700,
      lineHeight: 1.2,
    };
    expect(messages(doc({ type: 'heading', attrs: styled, content: [text('H5')] }))).toEqual([]);
    const unstyled = {
      level: 6,
      fontFamily: null,
      fontSize: null,
      fontWeight: null,
      lineHeight: null,
    };
    expect(messages(doc({ type: 'heading', attrs: unstyled, content: [text('H6')] }))).toEqual([]);
  });

  it.each([
    { fontFamily: 'Comic Sans' },
    { fontFamily: 'inter; color: red' },
    { fontSize: 11 },
    { fontSize: 97 },
    { fontSize: 20.5 },
    { fontWeight: 450 },
    { lineHeight: 3 },
    { style: 'color: red' },
  ])('rejects the heading style %j', (attrs) => {
    expect(
      messages(doc({ type: 'heading', attrs: { level: 2, ...attrs }, content: [text('x')] })),
    ).not.toEqual([]);
  });

  const linked = (rel: string | null) =>
    doc(paragraph(text('x', [{ type: 'link', attrs: { href: '/a', rel } }])));

  it.each(['nofollow', 'sponsored ugc', 'noopener noreferrer nofollow', null])(
    'accepts the link rel %j',
    (rel) => {
      expect(messages(linked(rel))).toEqual([]);
    },
  );

  it.each(['external', 'nofollow" onclick="x', 'me'])('rejects the link rel %j', (rel) => {
    expect(messages(linked(rel))).toContain('Links may only be marked nofollow, sponsored or ugc.');
  });

  it('keeps the rel pattern in step with LINK_REL_TOKENS', () => {
    for (const token of LINK_REL_TOKENS) expect(messages(linked(token)), token).toEqual([]);
  });

  it('accepts an image caption', () => {
    const image = { src: '/a.png', alt: 'A', caption: 'Figure 1' };
    expect(messages(doc({ type: 'image', attrs: image }))).toEqual([]);
  });

  it('limits nesting depth and text length', () => {
    let nested: RichTextNode = paragraph(text('deep'));
    for (let level = 0; level < RICH_TEXT_LIMITS.maxDepth; level += 1) {
      nested = { type: 'bulletList', content: [{ type: 'listItem', content: [nested] }] };
    }
    expect(messages(doc(nested))).toContain('The document is nested too deeply.');

    const long = Array.from({ length: 11 }, () =>
      paragraph(text('a'.repeat(RICH_TEXT_LIMITS.maxTextNodeLength))),
    );
    expect(messages(doc(...long))).toContain(
      `The text is too long (maximum ${RICH_TEXT_LIMITS.maxTextLength} characters).`,
    );
  });

  it('limits the number of nodes', () => {
    const many = Array.from({ length: 1000 }, () =>
      paragraph(text('a'), text('b'), text('c'), text('d'), text('e')),
    );
    expect(messages(doc(...many))).toContain('The document is too long.');
  });
});

describe('richTextToPlainText', () => {
  it('joins blocks with newlines and keeps inline text together', () => {
    const input = doc(
      paragraph(text('Hello '), text('world')),
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('item'))] }] },
      paragraph(text('a'), { type: 'hardBreak' }, text('b')),
    );
    expect(richTextToPlainText(input)).toBe('Hello world\nitem\na\nb\n');
  });
});

describe('headingStyle', () => {
  it('maps allowed values to CSS and ignores everything else', () => {
    expect(
      headingStyle({ fontFamily: 'lora', fontSize: 32, fontWeight: 600, lineHeight: 1.3 }),
    ).toEqual({
      fontFamily: "var(--font-lora), 'Lora', Georgia, serif",
      fontSize: '2rem',
      fontWeight: '600',
      lineHeight: '1.3',
    });
    const hostile = {
      fontFamily: 'x; color: red',
      fontSize: 500,
      fontWeight: 450,
      lineHeight: '2',
    };
    expect(headingStyle(hostile)).toEqual({});
    expect(headingStyle({ fontFamily: 'constructor' })).toEqual({});
    expect(headingStyle(undefined)).toEqual({});
  });
});

const heading = (level: number, ...content: RichTextNode[]): RichTextNode => ({
  type: 'heading',
  attrs: { level },
  content,
});

describe('headingOutline', () => {
  it('lists headings in order with unique ids', () => {
    const outline = headingOutline(
      doc(
        heading(2, text('Setup')),
        heading(3, text('Why '), text('it', [{ type: 'bold' }])),
        heading(2, text('Setup')),
        heading(2),
        heading(4, text('!!!')),
        { type: 'blockquote', content: [heading(6, text('Setup'))] },
      ),
    );
    expect(outline.map(({ level, text: title, id }) => ({ level, title, id }))).toEqual([
      { level: 2, title: 'Setup', id: 'setup' },
      { level: 3, title: 'Why it', id: 'why-it' },
      { level: 2, title: 'Setup', id: 'setup-2' },
      { level: 4, title: '!!!', id: 'section' },
      { level: 6, title: 'Setup', id: 'setup-3' },
    ]);
  });
});

describe('extractLinks', () => {
  it('collects links with their text, kind and qualifiers', () => {
    const external = {
      type: 'link' as const,
      attrs: { href: 'https://a.example', target: '_blank', rel: 'nofollow sponsored' },
    };
    const pricing = { type: 'link' as const, attrs: { href: '/pricing' } };
    const links = extractLinks(
      doc(
        paragraph(
          text('Read '),
          text('the ', [external]),
          text('docs', [external, { type: 'bold' }]),
          text(' and '),
          text('pricing', [pricing]),
        ),
        paragraph(text('again', [pricing])),
      ),
    );
    expect(links).toEqual([
      {
        href: 'https://a.example',
        text: 'the docs',
        internal: false,
        newTab: true,
        rel: ['nofollow', 'sponsored'],
      },
      { href: '/pricing', text: 'pricing', internal: true, newTab: false, rel: [] },
      { href: '/pricing', text: 'again', internal: true, newTab: false, rel: [] },
    ]);
  });
});

describe('countWords and readingTimeMinutes', () => {
  it('counts words across punctuation and languages', () => {
    expect(countWords("Don't stop — it's 2026, well-known café.")).toBe(6);
    expect(countWords('   ')).toBe(0);
  });

  it('rounds to whole minutes with a minimum of one', () => {
    expect(readingTimeMinutes(0)).toBe(0);
    expect(readingTimeMinutes(50)).toBe(1);
    expect(readingTimeMinutes(1100)).toBe(5);
  });
});
