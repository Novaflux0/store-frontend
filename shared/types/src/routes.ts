/** Every API route is versioned under this prefix (doc §7.6). */
export const API_PREFIX = '/api/v1';

/**
 * Route paths relative to `API_PREFIX`. NestJS controllers use them with
 * `app.setGlobalPrefix('api/v1')`; the web client prefixes them with `apiPath()`.
 */
export const API_ROUTES = {
  health: {
    live: '/health/live',
    ready: '/health/ready',
  },
  leads: '/leads',
  newsletter: {
    subscribe: '/newsletter/subscribe',
    confirm: '/newsletter/confirm',
    unsubscribe: '/newsletter/unsubscribe',
  },
  careers: {
    applications: '/careers/applications',
  },
  files: {
    uploadUrl: '/files/upload-url',
  },
  /** Staff authentication (ADR 0014, R1-A). Called only by the admin server (ADR 0015). */
  auth: {
    login: '/auth/login',
    mfaVerify: '/auth/mfa/verify',
    mfaEnrollStart: '/auth/mfa/enroll/start',
    mfaEnrollConfirm: '/auth/mfa/enroll/confirm',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    stepUp: '/auth/step-up',
    passwordForgot: '/auth/password/forgot',
    passwordReset: '/auth/password/reset',
    invitationAccept: '/auth/invitations/accept',
    jwks: '/auth/jwks',
  },
  /**
   * Admin dashboard API. Every route needs a staff session, the Cloudflare Access
   * JWT and one permission. `:name` segments are filled with `fillRoute()`.
   */
  admin: {
    me: '/admin/me',
    // guardian-ignore SEC004: a route path, not a secret
    mePassword: '/admin/me/password',
    meRecoveryCodes: '/admin/me/recovery-codes',
    meSessions: '/admin/me/sessions',
    meSession: '/admin/me/sessions/:id',
    dashboard: '/admin/dashboard',
    directory: '/admin/directory',
    users: '/admin/users',
    user: '/admin/users/:id',
    userSessions: '/admin/users/:id/sessions',
    userResetMfa: '/admin/users/:id/reset-mfa',
    invitations: '/admin/invitations',
    invitation: '/admin/invitations/:id',
    invitationResend: '/admin/invitations/:id/resend',
    leads: '/admin/leads',
    lead: '/admin/leads/:id',
    leadNotes: '/admin/leads/:id/notes',
    subscribers: '/admin/newsletter/subscribers',
    subscribersExport: '/admin/newsletter/subscribers/export',
    subscriber: '/admin/newsletter/subscribers/:id',
    applications: '/admin/applications',
    application: '/admin/applications/:id',
    applicationCvUrl: '/admin/applications/:id/cv-url',
    audit: '/admin/audit',
    botDefenseUnban: '/admin/bot-defense/unban',
    contentList: '/admin/content/:type',
    contentEntry: '/admin/content/:type/:id',
    contentPublish: '/admin/content/:type/:id/publish',
    contentUnpublish: '/admin/content/:type/:id/unpublish',
    contentArchive: '/admin/content/:type/:id/archive',
    contentSchedule: '/admin/content/:type/:id/schedule',
    contentRevisions: '/admin/content/:type/:id/revisions',
    contentRestore: '/admin/content/:type/:id/revisions/:version/restore',
    contentPreview: '/admin/content/:type/:id/preview',
    contentFeature: '/admin/content/:type/:id/feature',
    media: '/admin/media',
    mediaUploadUrl: '/admin/media/upload-url',
    mediaItem: '/admin/media/:id',
    settings: '/admin/settings/:key',
    redirects: '/admin/seo/redirects',
    redirect: '/admin/seo/redirects/:id',
    redirectsFlatten: '/admin/seo/redirects/flatten',
    notFound: '/admin/seo/not-found',
    notFoundItem: '/admin/seo/not-found/:id',
    linkChecks: '/admin/seo/links',
    linkChecksScan: '/admin/seo/links/scan',
  },
  /** Published content and public settings, read by the storefront (cached by tag). */
  content: {
    list: '/content/:type',
    entry: '/content/:type/:slug',
    preview: '/content/preview',
  },
  settings: {
    public: '/settings/public',
  },
  /** The redirect map the storefront proxy applies (`GET`, small, read every minute). */
  redirects: '/redirects',
  /** 404s and redirect hits reported by the storefront (signed, see API_HEADERS). */
  seoEvents: '/internal/seo-events',
} as const;

type RouteValues<T> = T extends string ? T : { [K in keyof T]: RouteValues<T[K]> }[keyof T];

/** Union of every route path in `API_ROUTES`. */
export type ApiRoute = RouteValues<typeof API_ROUTES>;

/** Joins a route with the version prefix: `apiPath('/leads')` -> `/api/v1/leads`. */
export function apiPath(route: ApiRoute): `${typeof API_PREFIX}${ApiRoute}` {
  return `${API_PREFIX}${route}`;
}

/** Names of the `:param` segments of a route, e.g. `'type' | 'id'`. */
export type RouteParams<R extends string> = R extends `${string}:${infer Param}/${infer Rest}`
  ? Param | RouteParams<`/${Rest}`>
  : R extends `${string}:${infer Param}`
    ? Param
    : never;

/**
 * Fills the `:param` segments of a route with URL-encoded values:
 * `fillRoute(API_ROUTES.admin.lead, { id })` -> `/admin/leads/0192...`.
 * Throws when a value is missing or empty, so a bad call never hits a wrong URL.
 */
export function fillRoute<R extends ApiRoute>(
  route: R,
  params: Readonly<Record<RouteParams<R>, string | number>>,
): string {
  const values = params as Readonly<Record<string, string | number>>;
  return route.replace(/:([A-Za-z]+)/g, (_segment, name: string) => {
    const value = values[name];
    if (value === undefined || String(value).length === 0) {
      throw new Error(`Missing route parameter "${name}" for ${route}`);
    }
    // encodeURIComponent keeps "." and "..", and URL parsing resolves them, so `..`
    // would silently point the request at a parent route.
    if (String(value) === '.' || String(value) === '..') {
      throw new Error(`Invalid route parameter "${name}" for ${route}`);
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Request headers shared by the web app and the API.
 * `clientIp*` implement the signed client-IP forwarding from Server Actions (ADR 0006).
 */
export const API_HEADERS = {
  /** Makes POST retries safe; results are cached for 24 hours. */
  idempotencyKey: 'Idempotency-Key',
  /** Original visitor IP (from `CF-Connecting-IP`), forwarded by Next.js Server Actions. */
  clientIp: 'X-Client-IP',
  /** Unix time in milliseconds when the web server signed `X-Client-IP`. */
  clientIpTimestamp: 'X-Client-IP-Timestamp',
  /** Hex HMAC-SHA256 of `${clientIp}.${timestamp}` with the shared secret. */
  clientIpSignature: 'X-Client-IP-Signature',
  /** Echoed on every response; equals `ProblemDetails.traceId`. */
  requestId: 'X-Request-Id',
  /** Cloudflare Zero Trust Access JWT; required on `/auth/*` and `/admin/*` (ADR 0014). */
  cfAccessJwt: 'Cf-Access-Jwt-Assertion',
  /** HMAC signature of a storefront revalidation request from the API (Phase 6). */
  revalidateSignature: 'X-Revalidate-Signature',
  revalidateTimestamp: 'X-Revalidate-Timestamp',
  /**
   * HMAC of a storefront SEO event (404 or redirect hit) sent to the API: hex
   * HMAC-SHA256 of `seo-event.${timestamp}.${body}` with the revalidation secret (the
   * prefix keeps it from ever passing as a revalidation request, or the reverse).
   */
  seoEventSignature: 'X-Seo-Event-Signature',
  seoEventTimestamp: 'X-Seo-Event-Timestamp',
} as const;
