import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@agency/ui';
import { countWords, readingTimeMinutes, richTextToPlainText } from '@agency/validation';

import { Breadcrumbs } from '@/components/blog/Breadcrumbs';
import { FaqSection } from '@/components/blog/FaqSection';
import { PostCover } from '@/components/blog/PostCover';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { RichText } from '@/components/content/RichText';
import { PageHeader } from '@/components/sections/PageHeader';
import { TagList } from '@/components/sections/TagList';
import { formatDate } from '@/content/format';
import {
  type BlogPost,
  getBlogCategory,
  getBlogPost,
  getSettings,
  getTeamMember,
  listBlogPosts,
} from '@/content/registry';
import {
  type BreadcrumbItem,
  JsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
} from '@/lib/seo/json-ld';
import { orFallback, pageMetadata } from '@/lib/seo/metadata';

// Posts published after the build render on first request; unknown slugs are 404.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await listBlogPosts()).map(({ slug }) => ({ slug }));
}

/** The post's category and author entries; missing or unpublished ones are left out. */
async function relatedOf(post: BlogPost) {
  const [category, author] = await Promise.all([
    post.data.category === undefined ? null : getBlogCategory(post.data.category),
    post.data.authorRef === undefined ? null : getTeamMember(post.data.authorRef),
  ]);
  return { category, author };
}

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const [post, settings] = await Promise.all([getBlogPost((await params).slug), getSettings()]);
  if (!post) return {};
  const { data } = post;
  const { category } = await relatedOf(post);
  return pageMetadata(
    {
      title: orFallback(data.seo?.title, post.title),
      description: orFallback(data.seo?.description, data.description),
      path: `/blog/${post.slug}`,
      article: {
        publishedTime: data.date,
        modifiedTime: post.modifiedAt,
        section: category?.title,
        tags: data.tags,
      },
      image: data.cover,
      seo: data.seo,
    },
    settings,
  );
}

export default async function BlogPostPage({ params }: PageProps<'/blog/[slug]'>) {
  const [post, settings] = await Promise.all([getBlogPost((await params).slug), getSettings()]);
  if (!post) notFound();
  const { slug, title, data } = post;
  const path = `/blog/${slug}`;
  const { category, author } = await relatedOf(post);
  const words = countWords(richTextToPlainText(data.body));
  const minutes = readingTimeMinutes(words);
  // "Updated" only when the live version changed on a later day than the post date.
  const updated = post.modifiedAt.slice(0, 10);
  const faq = data.faq ?? [];
  const byline = author?.title ?? data.author;

  const trail: BreadcrumbItem[] = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    ...(category ? [{ name: category.title, path: `/blog/category/${category.slug}` }] : []),
    { name: title, path },
  ];

  return (
    <article>
      <JsonLd
        data={articleJsonLd(
          {
            title,
            description: data.description,
            path,
            datePublished: data.date,
            dateModified: post.modifiedAt,
            author: author ? { name: author.title, jobTitle: author.data.role } : data.author,
            tags: data.tags,
            image: data.cover?.src,
            section: category?.title,
            wordCount: words,
          },
          settings.site,
        )}
      />
      <JsonLd data={breadcrumbJsonLd(trail)} />
      {faq.length > 0 ? <JsonLd data={faqPageJsonLd(faq)} /> : null}
      <PageHeader
        eyebrow={category?.title ?? 'Blog'}
        title={title}
        before={<Breadcrumbs items={trail} />}
      >
        <p>{data.description}</p>
        <p className="mt-4 text-sm">
          <time dateTime={data.date}>{formatDate(data.date)}</time>
          {updated > data.date ? (
            <>
              {' '}
              · Updated <time dateTime={post.modifiedAt}>{formatDate(updated)}</time>
            </>
          ) : null}
          {byline ? <> · {byline}</> : null}
          {minutes > 0 ? <> · {minutes} min read</> : null}
        </p>
        <TagList tags={data.tags} className="mt-4" />
      </PageHeader>
      <Container className="section-b">
        <div className="max-w-3xl">
          {data.cover ? <PostCover cover={data.cover} /> : null}
          {data.tableOfContents ? <TableOfContents doc={data.body} /> : null}
          <RichText doc={data.body} />
          <FaqSection items={faq} />
        </div>
        <p className="mt-12 flex flex-wrap gap-6">
          <Link href="/blog" className="font-medium text-neon-cyan hover:underline">
            <span aria-hidden="true">←</span> All posts
          </Link>
          {category ? (
            <Link
              href={`/blog/category/${category.slug}` as Route}
              className="font-medium text-neon-cyan hover:underline"
            >
              More in {category.title}
            </Link>
          ) : null}
        </p>
      </Container>
    </article>
  );
}
