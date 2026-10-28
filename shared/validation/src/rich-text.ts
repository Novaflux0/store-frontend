import { z } from 'zod';

import {
  HEADING_FONT_KEYS,
  HEADING_FONT_WEIGHTS,
  HEADING_LEVELS,
  HEADING_STYLE_LIMITS,
  LINK_REL_TOKENS,
  RICH_TEXT_BLOCK_NODES,
  RICH_TEXT_INLINE_NODES,
  RICH_TEXT_MARK_TYPES,
  RICH_TEXT_NODE_TYPES,
  type RichTextDoc,
  type RichTextMarkType,
  type RichTextNode,
  type RichTextNodeType,
} from './rich-text-options.js';

/**
 * Rich text is stored as TipTap/ProseMirror JSON, never as HTML (ADR 0014). This
 * schema is the allowlist: only the node types, marks and attributes below are
 * accepted, links may only point to http(s), mailto, site-relative paths or
 * anchors, and the document has size and depth limits. The storefront renders
 * the same allowlist to React elements, so there is no stored-XSS path.
 */

export const RICH_TEXT_LIMITS = {
  /** Nesting depth (doc > list > item > list > item ... ). */
  maxDepth: 10,
  maxNodes: 5000,
  /** Sum of every text node's length. */
  maxTextLength: 100_000,
  maxTextNodeLength: 10_000,
  maxChildren: 1000,
} as const;

const BLOCK_NODES = RICH_TEXT_BLOCK_NODES;
const INLINE_NODES = RICH_TEXT_INLINE_NODES;

/** Which children each node may contain (ProseMirror content expressions, simplified). */
const ALLOWED_CHILDREN: Readonly<Record<RichTextNodeType, readonly RichTextNodeType[]>> = {
  doc: BLOCK_NODES,
  paragraph: INLINE_NODES,
  heading: INLINE_NODES,
  codeBlock: ['text'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  listItem: ['paragraph', 'bulletList', 'orderedList'],
  blockquote: ['paragraph', 'heading', 'bulletList', 'orderedList'],
  horizontalRule: [],
  image: [],
  hardBreak: [],
  text: [],
};

/**
 * http(s) URL, mailto, a site-relative path or an in-page anchor. The path may not
 * start `//` or `/\` and holds no backslash: browsers treat `\` as `/`, so `/\evil.com`
 * would leave the site.
 */
const SAFE_HREF = /^(?:https?:\/\/[^\s]+|mailto:[^\s]+|\/(?![/\\])[^\s\\]*|#[\w-]+)$/i;
/** A media URL (the API checks the host) or a site-relative `/public` path. */
const SAFE_IMAGE_SRC = /^(?:https?:\/\/[^\s]+|\/(?!\/)[\w./-]+)$/;

/** Space-separated rel tokens: the editor's qualifiers, plus the defaults TipTap may write. */
const LINK_REL_ALLOWED: ReadonlySet<string> = new Set([
  ...LINK_REL_TOKENS,
  'noopener',
  'noreferrer',
]);
const isAllowedRel = (rel: string): boolean =>
  rel
    .trim()
    .split(/\s+/)
    .every((token) => token === '' || LINK_REL_ALLOWED.has(token.toLowerCase()));

const attrValue = z.union([z.string().max(2048), z.number(), z.boolean(), z.null()]);

const ATTR_SCHEMAS: Partial<Record<RichTextNodeType | RichTextMarkType, z.ZodType>> = {
  // The page title is the only <h1>. Style attributes are optional per heading and limited
  // to the self-hosted fonts and bounded numbers, so they can never carry arbitrary CSS.
  heading: z.strictObject({
    level: z.union(
      HEADING_LEVELS.map((level) => z.literal(level)),
      {
        error: 'Use a heading from H2 to H6.',
      },
    ),
    fontFamily: z.enum(HEADING_FONT_KEYS).nullable().optional(),
    fontSize: z
      .int()
      .min(HEADING_STYLE_LIMITS.fontSize.min)
      .max(HEADING_STYLE_LIMITS.fontSize.max)
      .nullable()
      .optional(),
    fontWeight: z
      .union(HEADING_FONT_WEIGHTS.map((weight) => z.literal(weight)))
      .nullable()
      .optional(),
    lineHeight: z
      .number()
      .min(HEADING_STYLE_LIMITS.lineHeight.min)
      .max(HEADING_STYLE_LIMITS.lineHeight.max)
      .nullable()
      .optional(),
  }),
  orderedList: z.strictObject({
    start: z.int().min(1).max(10_000).optional(),
    type: z.null().optional(),
  }),
  codeBlock: z.strictObject({
    language: z
      .string()
      .regex(/^[a-z0-9+#-]{1,20}$/)
      .nullable()
      .optional(),
  }),
  image: z.strictObject({
    src: z.string().max(2048).regex(SAFE_IMAGE_SRC, 'Images must come from the media library.'),
    alt: z.string().trim().min(1, 'Every image needs alt text.').max(200),
    title: z.string().max(200).nullable().optional(),
    caption: z.string().trim().max(300).nullable().optional(),
    width: z.int().positive().max(10_000).nullable().optional(),
    height: z.int().positive().max(10_000).nullable().optional(),
  }),
  link: z.strictObject({
    href: z.string().max(2048).regex(SAFE_HREF, 'Links must use https, mailto or a site path.'),
    // TipTap's link mark always serialises these. `rel` holds the editor's qualifiers
    // (nofollow, sponsored, ugc); the renderer adds noopener noreferrer itself.
    target: z.enum(['_blank']).nullable().optional(),
    rel: z
      .string()
      .max(100)
      .refine(isAllowedRel, 'Links may only be marked nofollow, sponsored or ugc.')
      .nullable()
      .optional(),
    class: z.null().optional(),
    title: z.string().max(200).nullable().optional(),
  }),
};

const markSchema = z.strictObject({
  type: z.enum(RICH_TEXT_MARK_TYPES),
  attrs: z.record(z.string(), attrValue).optional(),
});

const nodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.strictObject({
    type: z.enum(RICH_TEXT_NODE_TYPES),
    attrs: z.record(z.string(), attrValue).optional(),
    content: z.array(nodeSchema).max(RICH_TEXT_LIMITS.maxChildren).optional(),
    text: z.string().max(RICH_TEXT_LIMITS.maxTextNodeLength).optional(),
    marks: z.array(markSchema).max(RICH_TEXT_MARK_TYPES.length).optional(),
  }),
);

interface WalkState {
  nodes: number;
  textLength: number;
}

function checkAttrs(
  kind: RichTextNodeType | RichTextMarkType,
  attrs: RichTextNode['attrs'],
  path: (string | number)[],
  ctx: z.RefinementCtx,
): void {
  const schema = ATTR_SCHEMAS[kind];
  if (schema === undefined) {
    if (attrs !== undefined && Object.keys(attrs).length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'attrs'],
        message: `${kind} takes no attributes.`,
      });
    }
    return;
  }
  const result = schema.safeParse(attrs ?? {});
  for (const issue of result.error?.issues ?? []) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'attrs', ...issue.path.map(String)],
      message: issue.message,
    });
  }
}

/** Checks structure, attributes and limits; reports at most one issue per problem node. */
function walk(
  node: RichTextNode,
  path: (string | number)[],
  depth: number,
  state: WalkState,
  ctx: z.RefinementCtx,
  insideCode: boolean,
): void {
  state.nodes += 1;
  if (depth > RICH_TEXT_LIMITS.maxDepth) {
    ctx.addIssue({ code: 'custom', path, message: 'The document is nested too deeply.' });
    return;
  }
  checkAttrs(node.type, node.attrs, path, ctx);

  if (node.type === 'text') {
    if (node.text === undefined || node.text.length === 0) {
      ctx.addIssue({ code: 'custom', path, message: 'Text nodes must not be empty.' });
    }
    state.textLength += node.text?.length ?? 0;
    if (insideCode && node.marks !== undefined && node.marks.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'marks'],
        message: 'Code blocks take no formatting.',
      });
    }
    node.marks?.forEach((mark, index) => {
      checkAttrs(mark.type, mark.attrs, [...path, 'marks', index], ctx);
    });
  } else if (node.text !== undefined || node.marks !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path,
      message: `${node.type} cannot hold text or marks directly.`,
    });
  }

  const allowed = ALLOWED_CHILDREN[node.type];
  node.content?.forEach((child, index) => {
    const childPath = [...path, 'content', index];
    if (!allowed.includes(child.type)) {
      ctx.addIssue({
        code: 'custom',
        path: childPath,
        message: `${child.type} is not allowed inside ${node.type}.`,
      });
      return;
    }
    walk(child, childPath, depth + 1, state, ctx, insideCode || node.type === 'codeBlock');
  });
}

/** A whole rich-text document (the body of a post, case study, job or legal page). */
export const richTextDocSchema = nodeSchema
  .refine((node): node is RichTextDoc => node.type === 'doc', 'The document root must be doc.')
  .superRefine((doc, ctx) => {
    const state: WalkState = { nodes: 0, textLength: 0 };
    walk(doc, [], 0, state, ctx, false);
    if (state.nodes > RICH_TEXT_LIMITS.maxNodes) {
      ctx.addIssue({ code: 'custom', path: [], message: 'The document is too long.' });
    }
    if (state.textLength > RICH_TEXT_LIMITS.maxTextLength) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: `The text is too long (maximum ${RICH_TEXT_LIMITS.maxTextLength} characters).`,
      });
    }
  }) as unknown as z.ZodType<RichTextDoc>;

/** An empty document, used as the starting body of new entries. */
export const EMPTY_RICH_TEXT: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
