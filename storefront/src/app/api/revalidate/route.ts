import { API_HEADERS } from '@agency/types';
import { revalidateTag } from 'next/cache';

import { getServerEnv } from '@/lib/env/server';
import {
  REVALIDATE_MAX_BODY_BYTES,
  ReplayGuard,
  checkRevalidation,
} from '@/lib/security/revalidate';

/**
 * `POST /api/revalidate`: the API calls this after a publish or a settings change
 * (ADR 0014) with the cache tags to refresh, signed with REVALIDATE_HMAC_SECRET.
 * Tagged content is marked stale with `expire: 0`, so the next visitor gets the
 * new version instead of the cached one.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const replay = new ReplayGuard();

const json = (status: number, body: object) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * The body as text, or null once it passes `limit` bytes: read as a stream, so a
 * chunked request without `content-length` is cut off instead of buffered whole.
 */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > limit) return null;
  if (request.body === null) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function POST(request: Request): Promise<Response> {
  const body = await readLimited(request, REVALIDATE_MAX_BODY_BYTES);
  if (body === null) return json(413, { error: 'payload too large' });

  const secret = getServerEnv().REVALIDATE_HMAC_SECRET;
  const check = checkRevalidation({
    secrets: secret === undefined ? [] : [secret],
    timestamp: request.headers.get(API_HEADERS.revalidateTimestamp),
    signature: request.headers.get(API_HEADERS.revalidateSignature),
    body,
    nowMs: Date.now(),
    replay,
  });
  if (!check.ok) {
    console.warn(`[revalidate] refused: ${check.reason}`);
    return json(check.status, { error: 'refused' });
  }
  for (const tag of check.tags) revalidateTag(tag, { expire: 0 });
  return json(200, { revalidated: check.tags });
}
