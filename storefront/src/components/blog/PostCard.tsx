import type { Route } from 'next';
import Link from 'next/link';

import { StaticImage } from '@/components/media/StaticImage';
import { TagList } from '@/components/sections/TagList';
import { formatDate } from '@/content/format';
import type { BlogPost } from '@/content/registry';

/** A post in a list: cover, date, category, title, description and tags; the whole card links. */
export function PostCard({
  post,
  categoryName,
}: {
  readonly post: BlogPost;
  readonly categoryName?: string | undefined;
}) {
  const { slug, title, data } = post;
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors focus-within:border-neon-cyan hover:border-neon-cyan">
      {data.cover ? (
        <StaticImage
          src={data.cover.src}
          // The title below names the post; the picture adds nothing for screen readers.
          alt=""
          width={data.cover.width}
          height={data.cover.height}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-[16/9] w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-muted">
          <time dateTime={data.date}>{formatDate(data.date)}</time>
          {categoryName ? <> · {categoryName}</> : null}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-fg">
          {/* The whole card is clickable through the link's ::after overlay. */}
          <Link
            href={`/blog/${slug}` as Route}
            className="after:absolute after:inset-0 after:rounded-2xl"
          >
            {title}
          </Link>
        </h2>
        <p className="mt-3 flex-1 text-muted">{data.description}</p>
        <TagList tags={data.tags} className="mt-6" />
      </div>
    </article>
  );
}
