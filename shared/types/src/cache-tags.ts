/**
 * Cache tags shared by the API (which asks the storefront to revalidate them after
 * a publish) and the storefront (which tags its content fetches with them).
 */
export const CACHE_TAGS = {
  /** Every public settings document (site, navigation, SEO, features). */
  settings: 'settings',
  /** A content type's list, e.g. every published blog post. */
  contentList: (type: string) => `content:${type}`,
  /** One published entry. */
  contentEntry: (type: string, slug: string) => `content:${type}:${slug}`,
} as const;

/** Body of the storefront's `POST /api/revalidate` (signed, see API_HEADERS). */
export interface RevalidateRequest {
  readonly tags: readonly string[];
}
