import 'server-only';

import type {
  BlogCategoryData,
  FaqData,
  BlogPostData,
  CaseStudyData,
  HomePageData,
  JobData,
  LegalPageData,
  LegalPageSlug,
  PageSlug,
  PricingPlanData,
  ServiceData,
  StandardPageData,
  TeamMemberData,
  TestimonialData,
} from '@agency/validation';
import { cache } from 'react';

import { getEntry, getPublicSettings, listEntries, type CmsEntry } from './cms';

/**
 * The site's content, read from the CMS API (ADR 0014). Pages and layouts import
 * only from here; `cms.ts` handles fetching, caching tags, validation and drafts.
 * `cache()` dedupes calls within one render (layout, page and metadata).
 */

export type { CmsEntry, PublicSettings } from './cms';
export { featuredOrAll } from './featured';
export type BlogPost = CmsEntry<BlogPostData>;
export type BlogCategory = CmsEntry<BlogCategoryData>;
export type Faq = CmsEntry<FaqData>;
export type CaseStudy = CmsEntry<CaseStudyData>;
export type Job = CmsEntry<JobData>;
export type Service = CmsEntry<ServiceData>;
export type TeamMember = CmsEntry<TeamMemberData>;
export type Testimonial = CmsEntry<TestimonialData>;
export type PricingPlan = CmsEntry<PricingPlanData>;
export type StandardPage = CmsEntry<StandardPageData>;
export type StandardPageSlug = Exclude<PageSlug, 'home'>;

export const getSettings = cache(getPublicSettings);

/** Newest first by the date shown on the post, then by slug. */
function byDateDesc<T extends { readonly date: string }>(a: CmsEntry<T>, b: CmsEntry<T>) {
  return b.data.date.localeCompare(a.data.date) || a.slug.localeCompare(b.slug);
}

export const listBlogPosts = cache(async (): Promise<BlogPost[]> => {
  return (await listEntries<BlogPostData>('blog-post')).sort(byDateDesc);
});

export const getBlogPost = cache((slug: string) => getEntry<BlogPostData>('blog-post', slug));

/** Live posts only, never a previewed draft (the sitemap). */
export const listPublishedBlogPosts = cache(async (): Promise<BlogPost[]> => {
  return (await listEntries<BlogPostData>('blog-post', { published: true })).sort(byDateDesc);
});

export const listBlogCategories = cache(async (): Promise<BlogCategory[]> => {
  return (await listEntries<BlogCategoryData>('blog-category')).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
});

export const getBlogCategory = cache((slug: string) =>
  getEntry<BlogCategoryData>('blog-category', slug),
);

export const listCaseStudies = cache(async (): Promise<CaseStudy[]> => {
  return (await listEntries<CaseStudyData>('case-study')).sort(byDateDesc);
});

export const getCaseStudy = cache((slug: string) => getEntry<CaseStudyData>('case-study', slug));

/** Today (UTC) as `YYYY-MM-DD`; a role whose `validThrough` has passed is closed. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const isOpen = (job: Job) => job.data.validThrough >= today();

export const listOpenJobs = cache(async (): Promise<Job[]> => {
  const jobs = await listEntries<JobData>('job');
  return jobs
    .filter(isOpen)
    .sort(
      (a, b) => b.data.datePosted.localeCompare(a.data.datePosted) || a.slug.localeCompare(b.slug),
    );
});

/** An open role; closed roles are treated as missing (404). */
export const getJob = cache(async (slug: string): Promise<Job | null> => {
  const job = await getEntry<JobData>('job', slug);
  return job !== null && isOpen(job) ? job : null;
});

export const listServices = cache(() => listEntries<ServiceData>('service'));
export const listTeam = cache(() => listEntries<TeamMemberData>('team-member'));
export const getTeamMember = cache((slug: string) => getEntry<TeamMemberData>('team-member', slug));
export const listTestimonials = cache(() => listEntries<TestimonialData>('testimonial'));
export const listPricingPlans = cache(() => listEntries<PricingPlanData>('pricing-plan'));
/** The FAQ page's questions, in display order (the entry title is the question). */
export const listFaqs = cache(() => listEntries<FaqData>('faq'));

/** The home page sections; null only when the page was never seeded. */
export const getHomePage = cache(() => getEntry<HomePageData>('page', 'home'));

/** Header copy (eyebrow, heading, intro, SEO) of a standard page. */
export const getStandardPage = cache((slug: StandardPageSlug) =>
  getEntry<StandardPageData>('page', slug),
);

export const getLegalPage = cache((slug: LegalPageSlug) =>
  getEntry<LegalPageData>('legal-page', slug),
);
