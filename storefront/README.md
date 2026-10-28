# @agency/storefront

Next.js 16 (App Router, Turbopack, React 19) app for the public marketing site, and
later (Release 2) the client portal. Marketing pages are statically generated and
served from the CDN (ADR 0004).

The admin dashboard is **not** in this app: it is the separate [`admin/`](../admin/README.md)
app (ADR 0014). The two apps never import each other's code or call each other
directly; they share only `shared/*` packages and the backend API. Published content
comes from the backend API, and the backend calls a signed revalidation endpoint here
when something is published (see the root README, "How the apps connect").

## Run it

```sh
# from the repo root
pnpm install
cp storefront/.env.example storefront/.env   # local values; the API does not need to run
pnpm turbo run build --filter=@agency/storefront...   # builds shared packages, then the app
pnpm --filter @agency/storefront dev                  # http://localhost:3000
```

| Script              | What it does                                                                     |
| ------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`          | Dev server on port 3000                                                          |
| `pnpm build`        | `next build` (pages render per request for the CSP nonce, ADR 0004)              |
| `pnpm start`        | Serves the build on port 3000 (needs the server env below)                       |
| `pnpm lint`         | ESLint (shared `next` preset + `@next/eslint-plugin-next`), `--max-warnings=0`   |
| `pnpm typecheck`    | `tsc --noEmit`; Turbo runs `typegen` (typed routes) first                        |
| `pnpm test`         | Vitest + Testing Library (jsdom), 80% coverage on lib, content, forms, actions   |
| `pnpm test:e2e`     | Playwright smoke, content, CSP + axe (WCAG 2.2 AA) against `next start`          |
| `pnpm bundle:check` | First-load JS per route (gzip) against the 170 KB budget; run after `pnpm build` |

E2E setup once per machine: `pnpm exec playwright install chromium`. Build first. The
suite never needs the real API or Docker: Playwright also starts `e2e/mock-api.ts`
(port 4999, the agreed HTTP contract) for Server Actions, Cloudflare requests are
blocked unless a test serves the Turnstile stub (`stubTurnstile`), the object store is
stubbed in the browser (`stubUploadStorage`), and every CSP violation fails the test. Lighthouse CI budgets are in
`lighthouserc.json` (performance ≥ 0.9, accessibility / best practices / SEO = 1);
run with `npx @lhci/cli autorun` after a build.

## Environment

Validated with Zod; a bad value fails with a list of every problem.

| Variable                         | Where  | Notes                                                                                                                                  |
| -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `API_BASE_URL`                   | server | API **origin only**, e.g. `http://localhost:4000`. `apiPath()` from `@agency/types` adds `/api/v1`.                                    |
| `CLIENT_IP_HMAC_SECRET`          | server | ≥ 32 chars, identical to the API's (ADR 0006).                                                                                         |
| `FEATURE_CLIENT_PORTAL`          | server | `@agency/config` flag read by `proxy.ts`; off by default.                                                                              |
| `NEXT_PUBLIC_SITE_URL`           | public | Canonical origin for metadata, sitemap and JSON-LD.                                                                                    |
| `NEXT_PUBLIC_API_ORIGIN`         | public | Added to CSP `connect-src`.                                                                                                            |
| `NEXT_PUBLIC_UPLOAD_ORIGIN`      | public | Object storage for CV uploads (CSP `connect-src`): local MinIO `http://localhost:9000`, R2 in prod. Must equal the `uploadUrl` origin. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | Local: Cloudflare's always-pass test key `1x00000000000000000000AA`.                                                                   |

- `src/lib/env/server.ts` imports `server-only`. It is validated lazily (so static
  pages build without secrets) and eagerly at server start-up from
  `src/instrumentation.ts`, so a misconfigured deployment fails before serving traffic.
- `src/lib/env/client.ts`: `NEXT_PUBLIC_*` values are inlined at build time. Local and
  CI builds fall back to the local defaults; Vercel preview/production builds
  (`VERCEL_ENV`) must set every variable or the build fails.

## Structure

```
src/
  app/
    (marketing)/   page.tsx (home), services, portfolio(/[slug]), about, blog(/[slug]),
                   careers(/[slug]), contact, newsletter/{confirm,unsubscribe}, privacy,
                   terms, cookies, layout.tsx (header/footer), error.tsx
      contact/actions.ts      Server Action: re-validates, signs client IP, calls the API
      careers/actions.ts      requestCvUpload, submitApplication
      newsletter/actions.ts   subscribeNewsletter, confirmNewsletter, unsubscribeNewsletter
    (portal)/portal   R2 placeholder (closed by proxy.ts)
    layout.tsx  not-found.tsx  global-error.tsx  sitemap.ts  robots.ts  opengraph-image.tsx
  components/
    three/       journey/ (JourneyCanvas client gate, JourneyScene R3F, journey-math),
                 error boundary, device tier
    animation/   SmoothScrollProvider (Lenis + ScrollTrigger), RevealHeading (GSAP), FadeIn (Motion)
    sections/    Hero, home/ (the home page sections), WorkGrid, CtaBanner, ContactForm, Turnstile, …
    careers/     ApplyForm, application-resolver (lazy schema), cv-file (policy), upload-file (XHR PUT)
    newsletter/  NewsletterForm (footer), NewsletterTokenPanel (confirm / unsubscribe)
    mdx/         Markdown element map; media/StaticImage (server-only optimised <img>)
    layout/      SiteShell (skip link + header + main + footer), SiteHeader, SiteFooter, NavLink
  content/       blog/ work/ jobs/ *.mdx, schemas.ts (Zod frontmatter), collections.ts,
                 registry.ts, format.ts; services and team data
  mdx-components.tsx   required by @next/mdx; delegates to components/mdx
  hooks/         usePrefersReducedMotion, useInView
  lib/           api.ts (typed API client), api-contract.ts, env/, forms/ (action results,
                 server-action helpers, lazy Zod), security/ (csp,
                 headers, client-ip), seo/, site.ts
  proxy.ts       Next 16 proxy: denies /portal in R1, sets the per-request nonce CSP
scripts/         check-bundle-budget.mjs, build.mjs
e2e/             specs, fixtures (CSP check, Turnstile and storage stubs), mock-api.ts
  styles/globals.css   Tailwind v4 @theme tokens
public/.well-known/security.txt, public/models/
```

Shared primitives (`Button`, `Field`, `Container`, `VisuallyHidden`) come from
[`@agency/ui`](../shared/ui/README.md); `globals.css` scans its sources with `@source`.

## Contact form flow

`ContactForm` (client) → React Hook Form with the shared `createLeadSchema` (loaded in
a separate chunk right after mount, see "Budgets") → Turnstile token → Server Action
`submitLead` → `createLeadSchema.safeParse` again → `apiPost(API_ROUTES.leads, …)` with:

- `Idempotency-Key`: a UUID generated in the browser and reused while the same payload
  is retried; a new one is created when the payload changes or after success.
- `X-Client-IP`, `X-Client-IP-Timestamp`, `X-Client-IP-Signature` (ADR 0006): visitor IP
  from `cf-connecting-ip` → `x-real-ip` → first `x-forwarded-for`, signed as
  `hex(HMAC-SHA256(secret, "${ip}.${timestampMs}"))`; only sent for a valid `net.isIP` value.

The action returns `{ ok: true } | { ok: false, message, fieldErrors? }`: 400 Problem
Details `errors` become field errors, 429 becomes "Too many requests, try again later",
everything else a generic message. Problem `detail` and trace ids are logged, never shown.

## Content (MDX)

`@next/mdx` with `@mdx-js/loader` (no remark/rehype plugins, no frontmatter
library). Each file exports its metadata as a JS object, which the loader validates
with Zod at build time; an invalid file fails `next build` with the file name and the
field. Every content page is prerendered with `generateStaticParams` and
`dynamicParams = false`, so an unknown slug is a 404. Drafts (`draft: true`) show in
`next dev` and are left out of production builds; jobs past `validThrough` are left
out of the build too.

To add an entry, create `src/content/<collection>/<slug>.mdx`. The file name is the
URL slug (lowercase kebab-case; for jobs it is also the `jobSlug` the API stores):

```mdx
export const frontmatter = {
  title: 'Why we prerender every marketing page',
  description: 'One or two sentences for the card, meta description and Open Graph.',
  date: '2026-10-14', // YYYY-MM-DD
  tags: ['Performance'], // optional
  draft: false, // optional
};

## A heading (the page title is the only h1)

Markdown and JSX. Links: `/internal`, `https://…` or `mailto:`. Images: `/public` paths only.
```

Extra fields per collection (see `src/content/schemas.ts`):

- `blog/` (`/blog/<slug>`): `author?`.
- `work/` (`/portfolio/<slug>`): `client`, `services` (values of `SERVICE_OPTIONS`),
  `results` (1 to 6 lines), `cover: { src: '/images/…', alt, width, height }`.
- `jobs/` (`/careers/<slug>`): `location: { type: 'onsite' | 'hybrid' | 'remote', city?,
region?, country: 'DE' }` (city required unless remote), `employmentType`
  (`FULL_TIME`, `PART_TIME`, `CONTRACTOR`, …), `department`, `datePosted`,
  `validThrough`, `salary?: { currency: 'EUR', min, max?, unit: 'YEAR' }`.

Each page emits JSON-LD through the escaping `JsonLd` helper: `Article` (blog),
`CreativeWork` (case study), `JobPosting` (Google's required fields; remote roles use
`TELECOMMUTE` + `applicantLocationRequirements`) and `BreadcrumbList`. `sitemap.ts`
lists every published slug. The sample posts, case studies and jobs are placeholders:
replace them before launch (the jobs would be indexed as real postings).

## Careers apply flow

`ApplyForm` (client, React Hook Form) on `/careers/[slug]`, plan I2-1/I2-3:

1. Validate in the browser: the shared `jobApplicationSchema` (without `jobSlug` and
   `cvFileId`) loaded lazily, plus the CV against `ALLOWED_UPLOAD_MIME.cv` from
   `@agency/validation/constants` (PDF/DOCX, 10 MB; an empty browser MIME type falls
   back to the extension).
2. Server Action `requestCvUpload` → `POST /files/upload-url` (first Turnstile token,
   fresh `Idempotency-Key`, signed client IP) → `{ fileId, uploadUrl, headers }`.
3. The browser `PUT`s the file straight to `uploadUrl` with the returned headers
   (XHR, so `upload.onprogress` drives a `role="progressbar"`; `Content-Length` is
   left to the browser; a Cancel button aborts).
4. `turnstile.reset()` and wait for the next token.
5. Server Action `submitApplication` → `POST /careers/applications` with `cvFileId`
   and the second token (`Idempotency-Key` reused while the same payload is retried).
6. Success: "We received your application…".

422 `upload-not-found` and 409 `upload-already-used` clear the file input and ask for
the CV again (the next submit uploads anew); other failures keep the stored CV and
only retry step 5. Field errors from either call land on the matching control
(`fileName`/`mimeType`/`sizeBytes`/`cvFileId` → CV). Step changes are announced in a
polite live region, errors in `role="alert"`.

## Newsletter flow

- Footer `NewsletterForm` (every page, no form library or Zod): the Turnstile widget
  and its script are rendered only after the visitor focuses or touches the form.
  Server Action `subscribeNewsletter` (Idempotency-Key, signed IP). The API answers
  202 for every address and the UI always says "Check your inbox to confirm your
  subscription"; it never reveals whether an address was already subscribed.
- `/newsletter/confirm` and `/newsletter/unsubscribe`: static, `noindex`, not in the
  sitemap. Email links carry the token in the fragment (`#token=…`, never sent to a
  server). `NewsletterTokenPanel` reads it after hydration, checks the format
  (`OPAQUE_TOKEN_LENGTH` + base64url), removes it from the address bar with
  `history.replaceState`, and POSTs only when the visitor clicks the button (I2-7),
  so link scanners cannot confirm or unsubscribe anyone. 400
  `invalid-or-expired-token` shows a friendly "invalid or expired" message; 429/503
  keep the button for a retry.

## 3D and animation rules

- 3D is client-only: `dynamic(() => import('./JourneyScene'), { ssr: false })`, mounted after
  `requestIdleCallback`, so the 3D chunk (~260 KB gzip: three + R3F + drei +
  postprocessing) downloads after the main content.
- The home hero has its own opaque background (`sections/hero/HeroBackdrop`), so the page
  looks complete under `prefers-reduced-motion`, `saveData`, without WebGL, or if the
  scene throws (`CanvasErrorBoundary`; a 3D crash never breaks the page).
- Device tier (`components/three/device-tier.ts`): `pointer: coarse`, ≤ 4 cores or ≤ 4 GB
  memory → low tier (400 particles, no bloom); otherwise high (1,400 particles + Bloom).
  `PerformanceMonitor` drops to the low tier when the frame rate falls; `AdaptiveDpr`;
  `dpr={[1, 1.75]}`.
- The render loop stops (`frameloop="never"`) when the hero is off-screen or the tab is
  hidden (IntersectionObserver + `visibilitychange`).
- One instanced mesh for all particles (1 draw call); nothing is allocated in `useFrame`;
  R3F disposes JSX-declared geometries and materials on unmount.
- Animate only `transform` and `opacity`. GSAP, ScrollTrigger and Lenis are imported
  lazily (`components/animation/load-gsap.ts`); Motion uses `LazyMotion` + `m`.

### 3D assets (when real models arrive)

Every `.glb` must be optimised before it is committed (doc §6.3, plan A11):

```sh
pnpm dlx @gltf-transform/cli optimize input.glb public/models/hero.glb \
  --compress draco --texture-compress webp --texture-size 2048
```

Draco and KTX2 (Basis) decoders must be **self-hosted** under `public/decoders/` and
passed to drei's `useGLTF(url, '/decoders/draco/')` / `KTX2Loader.setTranscoderPath`.
Drei's default Google CDN decoder breaks `script-src 'self'`. Budgets: under 2–3 MB of
3D on first load, under 100 draw calls, 60 fps desktop / 30+ fps mid-range mobile.
A `models:optimize` script will be added with the first real model.

## Budgets

`next build` in Next 16 no longer prints per-route sizes; `pnpm bundle:check` sums the
gzip size of the `<script src>` chunks in each prerendered HTML file (ES-module
browsers only; `noModule` polyfills excluded). The framework baseline (React DOM +
Next runtime) is ~128 KB, so feature code has ~40 KB. Largest routes: home 164.7 KB,
careers job pages 162.0 KB, portfolio and services 161.9 KB, contact 160.8 KB.

- Client components import option lists and limits from the Zod-free
  `@agency/validation/constants` (I2-11). Schemas (Zod + resolvers, ~32 KB) load
  lazily through `lib/forms/load-validation.ts`, never from a client module's top level.
- Content images use `components/media/StaticImage` (`getImageProps` in a Server
  Component): `next/image` is a Client Component and costs ~5.5 KB on every route.
- The footer newsletter form adds ~3.6 KB to every page; Turnstile loads on interaction.
- GSAP + ScrollTrigger (~44 KB) and Lenis are dynamic imports.

## Security headers and CSP status

`next.config.ts` applies the doc §9.5 headers to every route (built in
`src/lib/security/headers.ts`, unit-tested): HSTS (2 years, preload),
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP `same-origin`,
`X-Frame-Options: DENY`; `poweredByHeader` is off.

The CSP is **enforced** with a per-request nonce (ADR 0004, nonce update). `proxy.ts`
creates a nonce for every page request and sends:

```
default-src 'self'; script-src 'nonce-…' 'strict-dynamic' 'self' https://challenges.cloudflare.com
'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: <media>;
font-src 'self'; connect-src 'self' <NEXT_PUBLIC_API_ORIGIN> <NEXT_PUBLIC_UPLOAD_ORIGIN>;
frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com;
worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self';
frame-ancestors 'none'; upgrade-insecure-requests
```

Next.js reads the nonce from the request's CSP header and stamps it on every script it
renders; the root layout reads it (`x-nonce`) for the theme script. A nonce needs
per-request rendering, so pages are rendered on request; content API reads stay
cached by tag and are revalidated on publish. Rules that keep it working:

- No inline `<script>` without the nonce (no `dangerouslySetInnerHTML` scripts, no
  inline event handlers). JSON-LD (`type="application/ld+json"`) is fine.
- Browser code loads Zod through `loadValidation()`, which sets `jitless`; otherwise
  Zod's `new Function` probe is reported as a violation.
- New third-party origins go into `buildCspDirectives` (`src/lib/security/csp.ts`);
  scripts are loaded by trusted code (`'strict-dynamic'`), e.g. through `next/script`.

The admin dashboard is the separate `admin/` app with its own nonce CSP. A `report-to`
endpoint is still to be added.
