import Link from 'next/link';

import { Container } from '@agency/ui';

import { StaticImage } from '@/components/media/StaticImage';
import type { CaseStudy } from '@/content/registry';

import { TagList } from '../TagList';
import { SectionHeading } from './SectionHeading';

export interface FeaturedWorkProps {
  readonly items: readonly Pick<CaseStudy, 'slug' | 'title' | 'data'>[];
}

/**
 * Selected case studies. On large screens the cards are sticky at staggered offsets,
 * so each new project slides over the previous one as you scroll (pure CSS, no
 * JavaScript); on phones they are a plain list.
 */
export function FeaturedWork({ items }: FeaturedWorkProps) {
  return (
    <Container as="section" aria-labelledby="work-title" className="section-y">
      <SectionHeading id="work-title" eyebrow="Case studies" title="Selected work">
        A few recent projects and what they achieved for our clients.
      </SectionHeading>

      <ul className="mt-12 flex flex-col gap-8 lg:gap-[16vh]">
        {items.map(({ slug, title, data }, index) => (
          <li
            key={slug}
            className="lg:sticky"
            style={{ top: `calc(6rem + ${String(index * 1.75)}rem)` }}
          >
            <article className="relative grid overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_-20px_60px_-30px_rgb(0_0_0/0.6)] transition-colors focus-within:border-neon-cyan hover:border-neon-cyan lg:grid-cols-[1.15fr_1fr]">
              <StaticImage
                src={data.cover.src}
                alt=""
                width={data.cover.width}
                height={data.cover.height}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="aspect-[4/3] w-full bg-surface-raised object-cover lg:aspect-auto lg:h-full"
              />
              <div className="flex flex-col p-6 md:p-10">
                <p className="text-sm text-muted">{data.client}</p>
                <h3 className="mt-2 text-2xl font-semibold text-fg md:text-3xl">
                  {/* The whole card is clickable through the link's ::after overlay. */}
                  <Link
                    href={`/portfolio/${slug}`}
                    className="after:absolute after:inset-0 after:rounded-3xl"
                  >
                    {title}
                  </Link>
                </h3>
                <p className="mt-3 text-muted">{data.description}</p>
                {data.results[0] ? (
                  <p className="mt-6 border-l-2 border-neon-cyan pl-4 font-display text-lg text-fg">
                    {data.results[0]}
                  </p>
                ) : null}
                <TagList tags={data.tags} className="mt-auto pt-8" />
              </div>
            </article>
          </li>
        ))}
      </ul>

      <p className="mt-10">
        <Link href="/portfolio" className="font-medium text-neon-cyan hover:underline">
          View the portfolio <span aria-hidden="true">→</span>
        </Link>
      </p>
    </Container>
  );
}
