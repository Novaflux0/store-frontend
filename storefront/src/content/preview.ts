import type { ContentType } from '@agency/validation/constants';

/**
 * Holds the signed preview token while Draft Mode is on (httpOnly, set by
 * `/api/preview`). Browsers accept `__Secure-` cookies on http://localhost too.
 */
export const PREVIEW_COOKIE = '__Secure-agency-preview';

/** Where an entry is shown on the site; types without their own page open their list. */
export function previewPath(type: ContentType, slug: string): string {
  switch (type) {
    case 'blog-post':
      return `/blog/${slug}`;
    case 'blog-category':
      return `/blog/category/${slug}`;
    case 'case-study':
      return `/portfolio/${slug}`;
    case 'job':
      return `/careers/${slug}`;
    case 'page':
    case 'legal-page':
      return slug === 'home' ? '/' : `/${slug}`;
    case 'service':
      return '/services';
    case 'team-member':
      return '/about';
    case 'pricing-plan':
      return '/pricing';
    case 'faq':
      return '/faq';
    case 'testimonial':
      return '/';
  }
}
