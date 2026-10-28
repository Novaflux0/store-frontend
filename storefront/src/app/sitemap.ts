import type { SeoOverride } from '@agency/validation';
import type { MetadataRoute } from 'next';

import {
  listBlogCategories,
  listCaseStudies,
  listOpenJobs,
  listPublishedBlogPosts,
} from '@/content/registry';
import { siteUrl } from '@/lib/env/client';
import { PUBLIC_ROUTES } from '@/lib/site';

interface Indexable {
  readonly data: { readonly seo?: SeoOverride | undefined };
}

/** Left out of the sitemap: noindex pages, and pages whose canonical URL is another one. */
function isIndexable(entry: Indexable, path: string): boolean {
  const canonical = entry.data.seo?.canonical;
  return (
    entry.data.seo?.robots?.index !== false &&
    (canonical === undefined || canonical === '' || canonical === path)
  );
}

/**
 * Static routes plus every published blog post, blog category, case study and open
 * role (revalidated with them), dated by their last publish. Only what is live: never
 * a previewed draft, and only the URLs that should be indexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, work, roles] = await Promise.all([
    listPublishedBlogPosts(),
    listBlogCategories(),
    listCaseStudies(),
    listOpenJobs(),
  ]);
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
  const contentEntries: MetadataRoute.Sitemap = [
    ...posts.map((post) => ({ entry: post, path: `/blog/${post.slug}`, date: post.modifiedAt })),
    ...categories.map((category) => ({
      entry: category,
      path: `/blog/category/${category.slug}`,
      date: category.modifiedAt,
    })),
    ...work.map((study) => ({
      entry: study,
      path: `/portfolio/${study.slug}`,
      date: study.modifiedAt,
    })),
    ...roles.map((role) => ({ entry: null, path: `/careers/${role.slug}`, date: role.modifiedAt })),
  ]
    .filter(({ entry, path }) => entry === null || isIndexable(entry, path))
    .map(({ path, date }) => ({
      url: new URL(path, siteUrl).toString(),
      lastModified: date,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
  return [...staticEntries, ...contentEntries];
}
