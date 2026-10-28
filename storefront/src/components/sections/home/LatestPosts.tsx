import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Container, cx } from '@agency/ui';

import { StaticImage } from '@/components/media/StaticImage';
import { formatDate } from '@/content/format';
import type { BlogPost } from '@/content/registry';

import { heroFontVariables } from '../hero/hero-fonts';

export interface LatestPostsProps {
  readonly posts: readonly Pick<BlogPost, 'slug' | 'title' | 'data'>[];
}

type Post = LatestPostsProps['posts'][number];

/** The diagonal arrow in the round "read more" buttons. */
function Arrow({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('size-4', className)}
    >
      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" />
    </svg>
  );
}

/** The post's cover, or a soft panel with its first tag when it has none. */
function Cover({ post }: { readonly post: Post }) {
  const { cover, tags } = post.data;
  if (cover) {
    return (
      <StaticImage
        src={cover.src}
        alt=""
        width={cover.width}
        height={cover.height}
        sizes="(min-width: 64rem) 20vw, 100vw"
        className="size-full object-cover"
      />
    );
  }
  return (
    <span className="relative grid size-full place-items-center overflow-hidden bg-[linear-gradient(150deg,#c9d67a,#8f9f2e)] p-4 text-center font-hero text-lg font-semibold text-white">
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.12)_0_2px,transparent_2px_14px)]"
      />
      <span className="relative">{tags[0] ?? 'Blog'}</span>
    </span>
  );
}

/**
 * Latest from the blog (after the "Our Product" reference): a heading and a "read
 * more" link over a row of soft green cards. One card is open, its excerpt and cover
 * showing; hovering or focusing another opens that one instead while the rest fold
 * down to their titles, all in CSS (`.blog-row` in globals.css). Phones list every
 * card open. Each card is one link to its post.
 */
export function LatestPosts({ posts }: LatestPostsProps) {
  if (posts.length === 0) return null;
  // The reference opens the middle card.
  const initial = posts.length >= 3 ? 1 : 0;
  return (
    <section
      aria-labelledby="blog-title"
      className={cx(heroFontVariables, 'section-y bg-paper font-hero text-ink')}
    >
      <Container>
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink/70">Our Blog</p>
              <h2
                id="blog-title"
                className="mt-3 text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.01em] uppercase"
              >
                Latest notes
                <br />
                from <span className="text-[#93a12b]">our studio</span>
              </h2>
            </div>
            <Link
              href="/blog"
              className="group/more flex items-center gap-3 text-sm font-semibold tracking-wide uppercase"
            >
              Read more<span className="sr-only"> on the blog</span>
              <span className="grid size-10 place-items-center rounded-full border border-ink/15 bg-white transition-colors duration-300 group-hover/more:border-[#93a12b] group-hover/more:bg-[#93a12b] group-hover/more:text-white">
                <Arrow />
              </span>
            </Link>
          </div>

          <ul className="blog-row mt-10 flex flex-col gap-4 md:h-[clamp(20rem,26vw,23rem)] md:flex-row md:gap-5">
            {posts.map((post, index) => (
              <li
                key={post.slug}
                data-default={index === initial ? '' : undefined}
                style={{ '--i': index } as CSSProperties}
                className="blog-card group relative min-w-0 overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#e3ecbd_0%,#eef3d8_45%,#f7f9ef_100%)] shadow-[0_10px_30px_-18px_rgb(60_70_20/0.35)]"
              >
                {/* Soft bubbles in the corner of a folded card. */}
                <span
                  aria-hidden="true"
                  className="blog-bubbles pointer-events-none absolute inset-0"
                >
                  <span className="absolute bottom-10 left-[-1.5rem] size-24 rounded-full bg-white/45" />
                  <span className="absolute bottom-24 left-12 size-10 rounded-full bg-white/50" />
                </span>
                <article className="relative flex h-full gap-5 p-6">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <time dateTime={post.data.date} className="text-xs text-ink/55">
                      {formatDate(post.data.date)}
                    </time>
                    <h3 className="mt-2 text-[clamp(1.25rem,1.7vw,1.6rem)] leading-[1.15] font-semibold text-[#2c3315]">
                      {/* The whole card is clickable through the link's ::after overlay. */}
                      <Link
                        href={`/blog/${post.slug}`}
                        className="after:absolute after:inset-0 after:rounded-[28px] focus-visible:outline-none"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="blog-excerpt mt-3 line-clamp-4 text-sm leading-relaxed text-ink/65">
                      {post.data.description}
                    </p>
                    <p className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm font-semibold">
                      Read More
                      <span className="blog-arrow grid size-10 shrink-0 place-items-center rounded-full border border-ink/15 bg-white/60">
                        <Arrow />
                      </span>
                    </p>
                  </div>
                  <div className="blog-cover w-[42%] shrink-0 overflow-hidden rounded-2xl">
                    <Cover post={post} />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
