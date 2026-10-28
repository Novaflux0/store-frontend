import { type NextFetchEvent, NextResponse, type NextRequest } from 'next/server';

import { clientEnv } from '@/lib/env/client';
import { isAreaClosed } from '@/lib/protected-areas';
import { buildCsp, createNonce, NONCE_HEADER } from '@/lib/security/csp';
import {
  goneHtml,
  PATHNAME_HEADER,
  redirectLookup,
  reportSeoEvent,
  REQUEST_ID_HEADER,
} from '@/lib/seo/redirects';

/**
 * Next.js 16 Proxy (formerly `middleware.ts`; Node.js runtime by default).
 *
 * 1. Release 1 has no authentication for clients, so `/portal` is denied by default:
 *    it redirects home unless `FEATURE_CLIENT_PORTAL` is switched on. The admin
 *    dashboard is not part of this app: it is the separate `admin/` app (ADR 0014).
 * 2. Redirects managed in the dashboard (blog SEO phase 3): 301 and 302 send the
 *    visitor on, 410 answers "gone" directly. The hit is reported to the API after the
 *    response (`waitUntil`). The map comes from memory (refreshed every minute).
 * 3. Content Security Policy (ADR 0004, nonce update): a fresh nonce per request, in
 *    the response's enforced policy and in the request's CSP header (Next.js reads
 *    the nonce from there while rendering) plus `x-nonce` for the root layout.
 * 4. `x-pathname` for the 404 page, which reports the missing path to the API.
 *
 * TODO(R2): verify the access JWT with `jose` against the API's JWKS and redirect to
 * `/auth/refresh` when only a refresh cookie exists (ADR 0010). Server Actions and
 * route handlers must still authorise every call themselves; the proxy is only the
 * first check.
 */

const CSP_OPTIONS = {
  apiOrigin: clientEnv.NEXT_PUBLIC_API_ORIGIN,
  uploadOrigin: clientEnv.NEXT_PUBLIC_UPLOAD_ORIGIN,
  mediaOrigin: clientEnv.NEXT_PUBLIC_MEDIA_ORIGIN,
  isDev: process.env.NODE_ENV === 'development',
} as const;

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (isAreaClosed(pathname, process.env)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const nonce = createNonce();
  const csp = buildCsp({ ...CSP_OPTIONS, nonce });

  const redirect =
    request.method === 'GET' || request.method === 'HEAD'
      ? await redirectLookup.find(pathname)
      : null;
  if (redirect !== null) {
    event.waitUntil(reportSeoEvent({ kind: 'redirect-hit', path: pathname }));
    if (redirect.statusCode === 410 || redirect.target === null) {
      return new NextResponse(request.method === 'HEAD' ? null : goneHtml(), {
        status: 410,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': csp,
          'X-Robots-Tag': 'noindex',
        },
      });
    }
    return NextResponse.redirect(new URL(redirect.target, request.url), redirect.statusCode);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  requestHeaders.set(REQUEST_ID_HEADER, crypto.randomUUID());

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Every page, but not build assets, image optimisation or files with an extension
  // (robots.txt, sitemap.xml, security.txt, models): they need no CSP.
  matcher: ['/((?!_next/static|_next/image|.*\\.[A-Za-z0-9]+$).*)'],
};
