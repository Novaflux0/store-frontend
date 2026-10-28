import Link from 'next/link';

import { Container } from '@agency/ui';

import { CategoryNav } from '@/components/blog/CategoryNav';
import { PostCard } from '@/components/blog/PostCard';
import { EmptyState } from '@/components/sections/EmptyState';
import { StandardPageHeader } from '@/components/sections/StandardPageHeader';
import { listBlogCategories, listBlogPosts } from '@/content/registry';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { standardPageMetadata } from '@/lib/seo/page-metadata';

export function generateMetadata() {
  return standardPageMetadata('blog', '/blog', {
    title: 'Blog',
    description: 'Notes on web design, engineering, 3D on the web and performance.',
  });
}

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([listBlogPosts(), listBlogCategories()]);
  const categoryNames = new Map(categories.map((category) => [category.slug, category.title]));
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ])}
      />
      <StandardPageHeader
        slug="blog"
        fallback={{ eyebrow: 'Blog', heading: 'Notes from the studio', intro: '' }}
      />
      <Container as="section" aria-label="Posts" className="section-b">
        <CategoryNav categories={categories} />
        {posts.length === 0 ? (
          <EmptyState title="No posts yet">
            <p>
              Our first articles are on the way.{' '}
              <Link
                href="/contact"
                className="text-neon-cyan underline underline-offset-4 hover:decoration-2"
              >
                Get in touch
              </Link>{' '}
              if there is a topic you would like us to cover.
            </p>
          </EmptyState>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <li key={post.slug}>
                <PostCard
                  post={post}
                  categoryName={
                    post.data.category === undefined
                      ? undefined
                      : categoryNames.get(post.data.category)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
