import { CONTENT_TYPES, type ContentType } from '@agency/validation/constants';
import type { Route } from 'next';
import { cookies, draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { getPreview } from '@/content/cms';
import { PREVIEW_COOKIE, previewPath } from '@/content/preview';

/**
 * `GET /api/preview?token=…`: opened from "Preview" in the dashboard (ADR 0014).
 * The API verifies the signed token; only then is Draft Mode switched on and the
 * token kept in an httpOnly cookie, so the pages can load the draft. The redirect
 * target is built from the verified entry, never from the query (no open redirect).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Matches the API's preview link lifetime (30 minutes). */
const PREVIEW_MAX_AGE_SECONDS = 30 * 60;
const SLUG = /^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]{1,100}$/;

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const preview = token.length > 0 && token.length <= 1024 ? await getPreview(token) : null;
  if (preview === null || !isContentType(preview.type) || !SLUG.test(preview.slug)) {
    return new Response('This preview link is invalid or has expired.', {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PREVIEW_MAX_AGE_SECONDS,
  });
  redirect(previewPath(preview.type, preview.slug) as Route);
}
