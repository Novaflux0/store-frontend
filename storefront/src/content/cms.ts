import 'server-only';

import { REQUEST_TIMEOUT_MS } from '@agency/config';
import { API_PREFIX, API_ROUTES, CACHE_TAGS, fillRoute, type ContentPreview } from '@agency/types';
import {
  contentDataSchema,
  type ContentType,
  featureSettingsSchema,
  navigationSettingsSchema,
  seoSettingsSchema,
  siteSettingsSchema,
  slugSchema,
} from '@agency/validation';
import { cookies, draftMode } from 'next/headers';
import { z } from 'zod';

import { getApiBaseUrl } from '@/lib/env/server';

import { PREVIEW_COOKIE } from './preview';

/**
 * Reads published content and public settings from the API (ADR 0014). Every fetch
 * is cached by Next.js and tagged with the shared `CACHE_TAGS`, so pages stay static
 * until the API asks for a revalidation after a publish (`/api/revalidate`).
 *
 * Responses are validated with the same schemas the API and the dashboard use: an
 * entry that does not match is dropped and logged, so one bad entry never breaks a
 * page. An unreachable API throws, which fails `next build` (and keeps serving the
 * last good page when a background regeneration fails).
 */

/** Thrown when the content API cannot be read; fails the build or the regeneration. */
export class ContentError extends Error {
  override readonly name = 'ContentError';
}

/** A published entry with its type-specific data, validated. */
export interface CmsEntry<T> {
  readonly slug: string;
  readonly title: string;
  readonly sortOrder: number;
  readonly publishedAt: string;
  readonly updatedAt: string;
  /** When the live version last changed: "Updated on", sitemap lastmod, dateModified. */
  readonly modifiedAt: string;
  readonly data: T;
}

const publishedShape = z
  .object({
    slug: z.string(),
    title: z.string(),
    sortOrder: z.number(),
    publishedAt: z.string(),
    updatedAt: z.string(),
    // Optional: responses cached before the API sent it fall back to the publish date.
    modifiedAt: z.string().optional(),
    data: z.unknown(),
  })
  .transform(({ modifiedAt, ...entry }) => ({
    ...entry,
    modifiedAt: modifiedAt ?? entry.publishedAt,
  }));

async function cmsFetch(path: string, tags: readonly string[], fresh = false): Promise<unknown> {
  const url = new URL(`${API_PREFIX}${path}`, getApiBaseUrl());
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(fresh ? { cache: 'no-store' } : { cache: 'force-cache', next: { tags: [...tags] } }),
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ContentError(`The content API is unreachable (${url.pathname}).`, { cause: error });
  }
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new ContentError(
      `The content API answered ${String(response.status)} for ${url.pathname}.`,
    );
  }
  return response.json() as Promise<unknown>;
}

/** Validates one published entry; logs and drops it when it does not match its schema. */
/**
 * Fields a schema no longer has, by content type. Responses cached before a field was
 * retired (the data cache outlives deploys) still carry it, and the strict schemas
 * would drop the whole entry; the reader removes them first. `page.faqs` became FAQ
 * entries (migration 0009_faq_data).
 */
const RETIRED_FIELDS: Partial<Record<ContentType, readonly string[]>> = { page: ['faqs'] };

function withoutRetiredFields(type: ContentType, data: unknown): unknown {
  const retired = RETIRED_FIELDS[type];
  if (retired === undefined || typeof data !== 'object' || data === null) return data;
  return Object.fromEntries(Object.entries(data).filter(([key]) => !retired.includes(key)));
}

export function parseEntry<T>(type: ContentType, raw: unknown): CmsEntry<T> | null {
  const shape = publishedShape.safeParse(raw);
  if (!shape.success) {
    console.error(`[cms] Dropped a ${type} entry with an unexpected shape.`);
    return null;
  }
  const data = contentDataSchema(type, shape.data.slug).safeParse(
    withoutRetiredFields(type, shape.data.data),
  );
  if (!data.success) {
    console.error(
      `[cms] Dropped ${type}/${shape.data.slug}: ${data.error.issues[0]?.message ?? 'invalid data'}`,
    );
    return null;
  }
  return { ...shape.data, data: data.data as T };
}

const previewShape = z.object({
  type: z.string(),
  slug: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  data: z.unknown(),
});

/**
 * The draft behind a signed preview token, never cached. Only the API can verify
 * the token; an invalid or expired one gives null.
 */
export async function getPreview(token: string): Promise<ContentPreview | null> {
  const raw = await cmsFetch(
    `${API_ROUTES.content.preview}?token=${encodeURIComponent(token)}`,
    [],
    true,
  );
  const parsed = previewShape.safeParse(raw);
  return parsed.success ? (parsed.data as ContentPreview) : null;
}

/**
 * The draft behind the preview cookie when Draft Mode is on. Draft Mode bypasses
 * every cache, and only the API can verify the token, so nothing here is ever served
 * to another visitor. Outside a request (generateStaticParams, the sitemap) there is
 * never a preview.
 */
async function previewDraft(type: ContentType): Promise<CmsEntry<unknown> | null> {
  try {
    if (!(await draftMode()).isEnabled) return null;
  } catch {
    return null;
  }
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  // An empty or missing cookie is no preview.
  if (!token) return null;
  const raw = await getPreview(token);
  if (raw?.type !== type) return null;
  return parseEntry(type, {
    slug: raw.slug,
    title: raw.title,
    sortOrder: 0,
    publishedAt: raw.updatedAt,
    updatedAt: raw.updatedAt,
    modifiedAt: raw.updatedAt,
    data: raw.data,
  });
}

/**
 * Every published entry of a type (API order: sort order, then newest first). In
 * Draft Mode the previewed draft replaces its published version, or is added, unless
 * `published` is set: the sitemap lists only what is live, whoever requests it.
 */
export async function listEntries<T>(
  type: ContentType,
  { published = false }: { readonly published?: boolean } = {},
): Promise<CmsEntry<T>[]> {
  const raw = await cmsFetch(fillRoute(API_ROUTES.content.list, { type }), [
    CACHE_TAGS.contentList(type),
  ]);
  if (!Array.isArray(raw)) {
    if (raw !== null) console.error(`[cms] The ${type} list is not an array.`);
    return [];
  }
  const entries = raw.map((item) => parseEntry<T>(type, item)).filter((entry) => entry !== null);
  if (published) return entries;
  const draft = (await previewDraft(type)) as CmsEntry<T> | null;
  if (draft === null) return entries;
  const index = entries.findIndex((entry) => entry.slug === draft.slug);
  return index === -1 ? [...entries, draft] : entries.with(index, draft);
}

/**
 * One published entry (or its draft in Draft Mode); null when it does not exist. The
 * slug comes from the URL, so anything that is not a valid slug is a 404 here and
 * never reaches the API (`/blog/x.php`, `/blog/..`).
 */
export async function getEntry<T>(type: ContentType, slug: string): Promise<CmsEntry<T> | null> {
  if (!slugSchema.safeParse(slug).success) return null;
  const draft = await previewDraft(type);
  if (draft?.slug === slug) return draft as CmsEntry<T>;
  const raw = await cmsFetch(fillRoute(API_ROUTES.content.entry, { type, slug }), [
    CACHE_TAGS.contentList(type),
    CACHE_TAGS.contentEntry(type, slug),
  ]);
  return raw === null ? null : parseEntry<T>(type, raw);
}

const publicSettingsSchema = z.object({
  site: siteSettingsSchema,
  navigation: navigationSettingsSchema,
  seo: seoSettingsSchema,
  features: featureSettingsSchema,
});

export type PublicSettings = z.infer<typeof publicSettingsSchema>;

/**
 * Site identity, navigation, SEO defaults and feature toggles. The API always sends
 * complete documents (its defaults fill the gaps), so an invalid answer is a contract
 * error and fails loudly instead of rendering a site without a name or navigation.
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  const raw = await cmsFetch(API_ROUTES.settings.public, [CACHE_TAGS.settings]);
  const parsed = publicSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContentError(
      `Invalid public settings from the API:\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}
