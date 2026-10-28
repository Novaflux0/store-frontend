import type { Route } from 'next';
import Link from 'next/link';

import type { BlogCategory } from '@/content/registry';

const CHIP = 'inline-block rounded-full border px-4 py-1.5 text-sm transition-colors';
const ACTIVE = 'border-neon-cyan text-neon-cyan';
const IDLE = 'border-line text-muted hover:text-fg';

/** Links to every category page, with the current one marked. */
export function CategoryNav({
  categories,
  current,
}: {
  readonly categories: readonly BlogCategory[];
  readonly current?: string;
}) {
  if (categories.length === 0) return null;
  return (
    <nav aria-label="Blog categories" className="mb-10">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/blog"
            aria-current={current === undefined ? 'page' : undefined}
            className={`${CHIP} ${current === undefined ? ACTIVE : IDLE}`}
          >
            All posts
          </Link>
        </li>
        {categories.map((category) => {
          const active = category.slug === current;
          return (
            <li key={category.slug}>
              <Link
                href={`/blog/category/${category.slug}` as Route}
                aria-current={active ? 'page' : undefined}
                className={`${CHIP} ${active ? ACTIVE : IDLE}`}
              >
                {category.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
