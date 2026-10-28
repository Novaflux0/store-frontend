/**
 * The entries chosen for the home page in the dashboard ("Home page" lists), in their
 * list order. Until anything is chosen, the whole list, so the section never empties.
 */
export function featuredOrAll<
  T extends { readonly data: { readonly featured?: boolean | undefined } },
>(entries: readonly T[]): T[] {
  const featured = entries.filter((entry) => entry.data.featured === true);
  return featured.length > 0 ? featured : [...entries];
}
