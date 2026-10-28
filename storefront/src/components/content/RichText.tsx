import {
  HEADING_LEVELS,
  headingOutline,
  headingStyle,
  type LinkRelToken,
  linkRelTokens,
  type RichTextMark,
  type RichTextNode,
  slugifyHeading,
} from '@agency/validation';
import type { Route } from 'next';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { StaticImage } from '@/components/media/StaticImage';

/**
 * Renders CMS rich text (TipTap JSON, ADR 0014) to React elements. Only the node and
 * mark types of `richTextDocSchema` are rendered; anything else renders nothing, so
 * stored content can never inject markup (`dangerouslySetInnerHTML` is never used).
 * Headings start at `<h2>` below the page's `<h1>` and get unique ids for in-page
 * anchors (the same ids as the table of contents); their optional font, size, weight
 * and line height come from `headingStyle`, which only emits allowlisted values.
 */

const LINK = 'text-neon-cyan underline underline-offset-4 hover:decoration-2';

/** `"Why static pages?"` -> `why-static-pages`, for heading anchors. */
export function headingId(text: string): string | undefined {
  return slugifyHeading(text) || undefined;
}

/** Shared while rendering one document: the unique id of every heading node. */
interface RenderContext {
  readonly ids: ReadonlyMap<RichTextNode, string>;
}

/** The plain text of a node (code blocks). */
function textOf(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(textOf).join('');
}

/**
 * Links: internal paths use `next/link` (prefetch, client navigation), anchors and
 * `http(s):` / `mailto:` links are plain anchors with `rel="noopener noreferrer"` plus
 * the editor's qualifiers (nofollow, sponsored, ugc), and any other scheme renders as
 * text (the schema already refuses them).
 */
export function RichLink({
  href,
  newTab,
  rel = [],
  children,
}: {
  readonly href: string;
  readonly newTab: boolean;
  readonly rel?: readonly LinkRelToken[];
  readonly children: ReactNode;
}) {
  // A site path, but not `//host` or `/\host` (browsers treat `\` as `/`).
  if (/^\/(?![/\\])[^\\]*$/.test(href)) {
    return (
      <Link href={href as Route} className={LINK}>
        {children}
      </Link>
    );
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} className={LINK}>
        {children}
      </a>
    );
  }
  if (/^(https?:\/\/|mailto:)/i.test(href)) {
    return (
      <a
        href={href}
        rel={['noopener', 'noreferrer', ...rel].join(' ')}
        {...(newTab ? { target: '_blank' } : {})}
        className={LINK}
      >
        {children}
      </a>
    );
  }
  return <span>{children}</span>;
}

function applyMark(mark: RichTextMark, children: ReactNode): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong className="font-semibold text-fg">{children}</strong>;
    case 'italic':
      return <em className="italic">{children}</em>;
    case 'strike':
      return <s>{children}</s>;
    case 'code':
      return (
        <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[0.9em] text-fg">
          {children}
        </code>
      );
    case 'link': {
      const href = mark.attrs?.href;
      if (typeof href !== 'string') return children;
      return (
        <RichLink
          href={href}
          newTab={mark.attrs?.target === '_blank'}
          rel={linkRelTokens(mark.attrs?.rel)}
        >
          {children}
        </RichLink>
      );
    }
    default:
      return children;
  }
}

function numberAttr(node: RichTextNode, name: string): number | undefined {
  const value = node.attrs?.[name];
  return typeof value === 'number' && value > 0 ? value : undefined;
}

function renderChildren(node: RichTextNode, ctx: RenderContext): ReactNode[] {
  return (node.content ?? []).map((child, index) => renderNode(child, index, ctx));
}

const HEADING_CLASSES = {
  2: 'mt-12 text-3xl font-semibold tracking-tight text-fg',
  3: 'mt-10 text-2xl font-semibold text-fg',
  4: 'mt-8 text-xl font-semibold text-fg',
  5: 'mt-8 text-lg font-semibold text-fg',
  6: 'mt-6 text-base font-semibold tracking-wide text-fg uppercase',
} as const;

// Anchored headings stop below the sticky header when jumped to from the contents.
const ANCHOR_OFFSET = 'scroll-mt-28';

function renderHeading(node: RichTextNode, key: number, ctx: RenderContext): ReactNode {
  const stored = numberAttr(node, 'level');
  // Level 2, and anything else (the page title is the only <h1>).
  const level = HEADING_LEVELS.find((candidate) => candidate === stored) ?? 2;
  const Tag = `h${level}` as const;
  const style = headingStyle(node.attrs) as CSSProperties;
  return (
    <Tag
      key={key}
      id={ctx.ids.get(node)}
      className={`${HEADING_CLASSES[level]} ${ANCHOR_OFFSET}`}
      {...(Object.keys(style).length > 0 ? { style } : {})}
    >
      {renderChildren(node, ctx)}
    </Tag>
  );
}

function renderNode(node: RichTextNode, key: number, ctx: RenderContext): ReactNode {
  switch (node.type) {
    case 'doc':
      return <div key={key}>{renderChildren(node, ctx)}</div>;
    case 'text':
      return (node.marks ?? []).reduceRight<ReactNode>(
        (children, mark) => applyMark(mark, children),
        <span key={key}>{node.text ?? ''}</span>,
      );
    case 'hardBreak':
      return <br key={key} />;
    case 'paragraph':
      return (
        <p key={key} className="mt-5 leading-relaxed text-muted">
          {renderChildren(node, ctx)}
        </p>
      );
    case 'heading':
      return renderHeading(node, key, ctx);
    case 'bulletList':
      return (
        <ul key={key} className="mt-5 list-disc space-y-2 pl-6 text-muted marker:text-neon-cyan">
          {renderChildren(node, ctx)}
        </ul>
      );
    case 'orderedList':
      return (
        <ol
          key={key}
          start={numberAttr(node, 'start')}
          className="mt-5 list-decimal space-y-2 pl-6 text-muted marker:text-neon-cyan"
        >
          {renderChildren(node, ctx)}
        </ol>
      );
    case 'listItem':
      return (
        // Paragraphs inside list items keep their own spacing compact.
        <li key={key} className="leading-relaxed [&>p]:mt-0">
          {renderChildren(node, ctx)}
        </li>
      );
    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="mt-6 border-l-2 border-neon-violet pl-5 text-fg italic [&>p]:text-fg"
        >
          {renderChildren(node, ctx)}
        </blockquote>
      );
    case 'codeBlock':
      return (
        <pre
          key={key}
          // Scrollable regions must be keyboard reachable (WCAG 2.1.1, axe scrollable-region-focusable).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed"
        >
          <code className="font-mono text-fg">{textOf(node)}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} className="my-10 border-line" />;
    case 'image': {
      const src = node.attrs?.src;
      const alt = node.attrs?.alt;
      if (typeof src !== 'string' || typeof alt !== 'string') return null;
      const caption = node.attrs?.caption;
      const image = (
        <StaticImage
          key={key}
          src={src}
          alt={alt}
          width={numberAttr(node, 'width') ?? 1200}
          height={numberAttr(node, 'height') ?? 675}
          sizes="(min-width: 768px) 720px, 100vw"
          className={`h-auto w-full rounded-2xl border border-line ${caption ? '' : 'my-8'}`}
        />
      );
      if (typeof caption !== 'string' || caption.trim() === '') return image;
      return (
        <figure key={key} className="my-8">
          {image}
          <figcaption className="mt-3 text-center text-sm text-muted">{caption}</figcaption>
        </figure>
      );
    }
    default:
      return null;
  }
}

/** A rich-text document; renders nothing for an empty or non-document value. */
export function RichText({ doc }: { readonly doc: RichTextNode | undefined }) {
  if (doc?.type !== 'doc') return null;
  const ids = new Map(headingOutline(doc).map((item) => [item.node, item.id]));
  return <>{renderChildren(doc, { ids })}</>;
}
