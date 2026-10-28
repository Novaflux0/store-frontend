import { cookies, draftMode } from 'next/headers';

import { PREVIEW_COOKIE } from '@/content/preview';

/** `POST /api/preview/exit`: leaves Draft Mode (the preview banner's button). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);
  // 303: the browser follows a POST with a GET of the home page.
  return Response.redirect(new URL('/', request.url), 303);
}
