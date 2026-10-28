import type { Route } from 'next';
import Link from 'next/link';

import type { BreadcrumbItem } from '@/lib/seo/json-ld';

/**
 * The trail to the current page, matching its BreadcrumbList structured data. The
 * last item is the current page: not a link, and marked `aria-current`.
 */
export function Breadcrumbs({ items }: { readonly items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-fg">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.path as Route}
                    className="underline-offset-4 hover:text-neon-cyan hover:underline"
                  >
                    {item.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
