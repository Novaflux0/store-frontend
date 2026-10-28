import Link from 'next/link';

import { FadeIn } from '@/components/animation/FadeIn';
import { StaticImage } from '@/components/media/StaticImage';
import type { CaseStudy } from '@/content/registry';

import { TagList } from './TagList';

export type WorkGridItem = Pick<CaseStudy, 'slug' | 'title' | 'data'>;

export interface WorkGridProps {
  readonly items: readonly WorkGridItem[];
  /** Heading level of each card title, so the outline stays in order on every page. */
  readonly headingLevel?: 'h2' | 'h3';
  /**
   * Cover images loaded eagerly when the grid starts above the fold (the first row:
   * up to 3 cards); the first one is the likely LCP and gets a high fetch priority.
   */
  readonly eagerImages?: number;
}

export function WorkGrid({ items, headingLevel: Heading = 'h3', eagerImages = 0 }: WorkGridProps) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map(({ slug, title, data }, index) => (
        <li key={slug}>
          <FadeIn delay={index * 0.08} className="h-full">
            <article className="relative flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-colors focus-within:border-neon-cyan hover:border-neon-cyan">
              <StaticImage
                src={data.cover.src}
                alt=""
                width={data.cover.width}
                height={data.cover.height}
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                loading={index < eagerImages ? 'eager' : 'lazy'}
                fetchPriority={index === 0 && eagerImages > 0 ? 'high' : undefined}
                className="mb-6 aspect-[4/3] w-full rounded-xl bg-surface-raised object-cover"
              />
              <p className="text-sm text-muted">{data.client}</p>
              <Heading className="mt-2 text-xl font-semibold text-fg">
                {/* The whole card is clickable through the link's ::after overlay. */}
                <Link
                  href={`/portfolio/${slug}`}
                  className="after:absolute after:inset-0 after:rounded-2xl"
                >
                  {title}
                </Link>
              </Heading>
              <p className="mt-3 flex-1 text-muted">{data.description}</p>
              <TagList tags={data.tags} className="mt-6" />
            </article>
          </FadeIn>
        </li>
      ))}
    </ul>
  );
}
