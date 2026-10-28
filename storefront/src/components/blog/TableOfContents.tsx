import { headingOutline, type RichTextNode } from '@agency/validation';

/** Fewer sections than this need no contents list. */
const MIN_ENTRIES = 3;

/**
 * "On this page": links to the post's H2 and H3 headings, with the same ids the
 * renderer gives them. Plain anchors, so it works without JavaScript.
 */
export function TableOfContents({ doc }: { readonly doc: RichTextNode }) {
  const entries = headingOutline(doc).filter((item) => item.level <= 3);
  if (entries.length < MIN_ENTRIES) return null;
  return (
    <nav
      aria-labelledby="toc-heading"
      className="mb-10 rounded-2xl border border-line bg-surface p-6"
    >
      <h2 id="toc-heading" className="text-sm font-semibold tracking-[0.15em] text-fg uppercase">
        On this page
      </h2>
      <ol className="mt-4 space-y-2 text-sm">
        {entries.map((item) => (
          <li key={item.id} className={item.level === 3 ? 'pl-4' : undefined}>
            <a
              href={`#${item.id}`}
              className="text-muted underline-offset-4 hover:text-neon-cyan hover:underline"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
