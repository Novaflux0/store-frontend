import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@agency/ui';

import { Breadcrumbs } from '@/components/blog/Breadcrumbs';
import { CategoryNav } from '@/components/blog/CategoryNav';
import { PostCard } from '@/components/blog/PostCard';
import { EmptyState } from '@/components/sections/EmptyState';
import { PageHeader } from '@/components/sections/PageHeader';
import {
  getBlogCategory,
  getSettings,
  listBlogCategories,
  listBlogPosts,
} from '@/content/registry';
import { type BreadcrumbItem, JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { orFallback, pageMetadata } from '@/lib/seo/metadata';

// Categories published after the build render on first request; unknown slugs are 404.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await listBlogCategories()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/blog/category/[slug]'>): Promise<Metadata> {
  const [category, settings] = await Promise.all([
    getBlogCategory((await params).slug),
    getSettings(),
  ]);
  if (!category) return {};
  const { data } = category;
  return pageMetadata(
    {
      title: orFallback(data.seo?.title, `${category.title} articles`),
      description: orFallback(data.seo?.description, data.description),
      path: `/blog/category/${category.slug}`,
      seo: data.seo,
    },
    settings,
  );
}

export default async function BlogCategoryPage({ params }: PageProps<'/blog/category/[slug]'>) {
  const { slug } = await params;
  const [category, categories, posts] = await Promise.all([
    getBlogCategory(slug),
    listBlogCategories(),
    listBlogPosts(),
  ]);
  if (!category) notFound();
  const inCategory = posts.filter((post) => post.data.category === category.slug);
  const trail: BreadcrumbItem[] = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: category.title, path: `/blog/category/${category.slug}` },
  ];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <PageHeader eyebrow="Blog" title={category.title} before={<Breadcrumbs items={trail} />}>
        <p>{category.data.description}</p>
      </PageHeader>
      <Container as="section" aria-label={`${category.title} posts`} className="section-b">
        <CategoryNav categories={categories} current={category.slug} />
        {inCategory.length === 0 ? (
          <EmptyState title="No posts in this category yet">
            <p>
              <Link
                href="/blog"
                className="text-neon-cyan underline underline-offset-4 hover:decoration-2"
              >
                Browse all posts
              </Link>{' '}
              in the meantime.
            </p>
          </EmptyState>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {inCategory.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
