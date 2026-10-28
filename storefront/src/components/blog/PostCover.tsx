import type { CoverImage } from '@agency/validation';
import type { Route } from 'next';
import Link from 'next/link';

import { StaticImage } from '@/components/media/StaticImage';

/**
 * The post's cover: the largest image above the fold, so it loads eagerly with high
 * priority (LCP). With a link it is clickable; external links open with noopener.
 */
export function PostCover({ cover }: { readonly cover: CoverImage }) {
  const image = (
    <StaticImage
      src={cover.src}
      alt={cover.alt}
      width={cover.width}
      height={cover.height}
      sizes="(min-width: 1024px) 960px, 100vw"
      loading="eager"
      fetchPriority="high"
      className="h-auto w-full rounded-2xl border border-line"
      {...(cover.title === undefined ? {} : { title: cover.title })}
    />
  );
  const href = cover.href;
  const linked =
    href === undefined ? (
      image
    ) : /^\/(?![/\\])/.test(href) ? (
      <Link href={href as Route} className="block rounded-2xl">
        {image}
      </Link>
    ) : (
      <a
        href={href}
        className="block rounded-2xl"
        {...(cover.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {image}
      </a>
    );
  return (
    <figure className="mb-10">
      {linked}
      {cover.caption ? (
        <figcaption className="mt-3 text-center text-sm text-muted">{cover.caption}</figcaption>
      ) : null}
    </figure>
  );
}
