// Response bodies of the staff auth, admin and content APIs (ADR 0014).
// Timestamps are ISO 8601 strings in UTC. Enum-like strings use the lower-case
// wire values from `@agency/validation/constants` (e.g. `LEAD_STATUSES`).

import { type StaffRole } from './roles.js';

/** A staff member as shown next to a record ("assigned to", "edited by"). */
export interface ActorRef {
  readonly id: string;
  readonly name: string;
}

// --- Auth -----------------------------------------------------------------------

/** Issued after a complete sign-in; the admin server keeps both in HttpOnly cookies. */
export interface AuthTokens {
  /** EdDSA JWT, 15 minutes. */
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  /** Opaque, single-use; rotated on every refresh. */
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
}

/**
 * `POST /auth/login` (200). The password was right; a second step follows. The
 * challenge token is single-use and valid for 5 minutes.
 */
export interface LoginResponse {
  readonly status: 'mfa_required' | 'mfa_enrollment_required';
  readonly challengeToken: string;
}

/** `POST /auth/mfa/enroll/start` (200): show the QR code (otpauth URI) and the secret. */
export interface MfaEnrollStartResponse {
  readonly otpauthUri: string;
  /** Base32 secret for manual entry. */
  readonly secret: string;
}

/** `POST /auth/mfa/enroll/confirm` (200): signed in; recovery codes are shown once. */
export interface MfaEnrollConfirmResponse {
  readonly tokens: AuthTokens;
  readonly recoveryCodes: readonly string[];
}

/** `POST /auth/mfa/verify` (200). */
export interface MfaVerifyResponse {
  readonly tokens: AuthTokens;
  /** Unused recovery codes left; the dashboard warns when it gets low. */
  readonly recoveryCodesRemaining: number;
}

/** `POST /auth/step-up` (200): sensitive actions are allowed until this time. */
export interface StepUpResponse {
  readonly elevatedUntil: string;
}

/** `GET /auth/jwks` (200): public keys that verify access JWTs. */
export interface JwksResponse {
  readonly keys: readonly Readonly<Record<string, string>>[];
}

/** `GET /admin/me` (200). */
export interface AdminMe {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: StaffRole;
  readonly recoveryCodesRemaining: number;
  /** Set while a step-up is valid. */
  readonly elevatedUntil: string | null;
}

/** `POST /admin/me/recovery-codes` (200): a new set; the old codes stop working. */
export interface RecoveryCodesResponse {
  readonly recoveryCodes: readonly string[];
}

export interface SessionInfo {
  readonly id: string;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
  readonly expiresAt: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
  /** The session making this request. */
  readonly current: boolean;
}

// --- Team -----------------------------------------------------------------------

export interface StaffUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: StaffRole;
  readonly status: 'active' | 'disabled';
  readonly mfaEnabled: boolean;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
}

export interface StaffInvitation {
  readonly id: string;
  readonly email: string;
  readonly role: StaffRole;
  readonly invitedBy: ActorRef | null;
  readonly expiresAt: string;
  readonly createdAt: string;
}

/** `GET /admin/users` (200): accounts plus open invitations. */
export interface TeamResponse {
  readonly users: readonly StaffUser[];
  readonly invitations: readonly StaffInvitation[];
}

// --- Dashboard and audit ---------------------------------------------------------

export interface AuditEntry {
  readonly id: string;
  /** e.g. `content.published`, `auth.login_failed`. */
  readonly action: string;
  readonly entity: string;
  readonly entityId: string | null;
  readonly actor: ActorRef | null;
  readonly ip: string | null;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>> | null;
  readonly createdAt: string;
}

/** `GET /admin/dashboard` (200). Sections the caller may not see are `null`. */
export interface DashboardSummary {
  readonly leads: { readonly new: number; readonly last30Days: number } | null;
  readonly applications: { readonly new: number; readonly last30Days: number } | null;
  readonly subscribers: { readonly confirmed: number; readonly pending: number } | null;
  readonly content: { readonly drafts: number; readonly scheduled: number };
  readonly recentActivity: readonly AuditEntry[] | null;
}

// --- Leads, subscribers, applications ---------------------------------------------

export interface LeadSummary {
  readonly id: string;
  readonly kind: 'contact' | 'inquiry';
  readonly name: string;
  readonly email: string;
  readonly company: string | null;
  readonly service: string | null;
  readonly status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'spam';
  readonly assignee: ActorRef | null;
  readonly createdAt: string;
}

export interface LeadNote {
  readonly id: string;
  readonly body: string;
  readonly author: ActorRef | null;
  readonly createdAt: string;
}

export interface LeadDetail extends LeadSummary {
  readonly budget: string | null;
  readonly timeline: string | null;
  readonly message: string;
  readonly updatedAt: string;
  readonly notes: readonly LeadNote[];
}

export interface Subscriber {
  readonly id: string;
  readonly email: string;
  readonly status: 'pending' | 'confirmed' | 'unsubscribed';
  readonly createdAt: string;
  readonly confirmedAt: string | null;
  readonly unsubscribedAt: string | null;
}

export interface ApplicationSummary {
  readonly id: string;
  readonly jobSlug: string;
  readonly name: string;
  readonly email: string;
  readonly status: 'new' | 'reviewing' | 'rejected' | 'hired';
  /** The CV can be downloaded only once it is `clean`. */
  readonly cvScanStatus: 'pending' | 'clean' | 'infected' | 'rejected';
  readonly createdAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  readonly phone: string | null;
  readonly portfolioUrl: string | null;
  readonly coverLetter: string | null;
  readonly cv: { readonly fileName: string; readonly mimeType: string; readonly sizeBytes: number };
}

/** A short-lived signed download link (5 minutes). */
export interface SignedUrlResponse {
  readonly url: string;
  readonly expiresAt: string;
}

// --- Content ------------------------------------------------------------------------

export type ContentStatusValue = 'draft' | 'scheduled' | 'published' | 'archived';

export interface ContentEntrySummary {
  readonly id: string;
  readonly type: string;
  readonly slug: string;
  readonly title: string;
  readonly status: ContentStatusValue;
  readonly sortOrder: number;
  /** Increases on every save; send it back to detect concurrent edits. */
  readonly version: number;
  /** The draft differs from what is live. */
  readonly hasUnpublishedChanges: boolean;
  readonly publishedAt: string | null;
  readonly scheduledAt: string | null;
  readonly updatedAt: string;
  readonly updatedBy: ActorRef | null;
}

export interface ContentEntryDetail<
  T = Readonly<Record<string, unknown>>,
> extends ContentEntrySummary {
  readonly draft: T;
  readonly published: T | null;
  readonly createdAt: string;
}

export interface ContentRevision {
  readonly version: number;
  readonly title: string;
  /** Written by the editor's autosave (one per editing session). */
  readonly autosave: boolean;
  readonly createdAt: string;
  readonly author: ActorRef | null;
}

/** `POST /admin/content/:type/:id/preview` (200): opens the draft on the storefront. */
export interface PreviewLinkResponse {
  readonly url: string;
  readonly expiresAt: string;
}

/** Published content as the storefront reads it (`GET /content/:type[/:slug]`). */
export interface PublishedContent<T = Readonly<Record<string, unknown>>> {
  readonly slug: string;
  readonly title: string;
  readonly sortOrder: number;
  readonly publishedAt: string;
  readonly updatedAt: string;
  /**
   * When the live version last changed (the latest publish): "Updated on", sitemap
   * `lastmod` and `dateModified`. `updatedAt` also moves on draft saves.
   */
  readonly modifiedAt: string;
  readonly data: T;
}

/** `GET /content/preview?token=` (200): the draft behind a preview link. */
export interface ContentPreview<T = Readonly<Record<string, unknown>>> {
  readonly type: string;
  readonly slug: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly modifiedAt: string;
  readonly data: T;
}

// --- Media ------------------------------------------------------------------------

export interface MediaVariant {
  readonly width: number;
  readonly format: 'avif' | 'webp';
  readonly url: string;
}

export interface MediaAsset {
  readonly id: string;
  readonly alt: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  /** `processing` until the scan and resize finish; `rejected` files are never served. */
  readonly status: 'processing' | 'ready' | 'rejected';
  readonly width: number | null;
  readonly height: number | null;
  /** Largest variant, for previews and `src`; null until ready. */
  readonly url: string | null;
  readonly variants: readonly MediaVariant[];
  readonly uploadedBy: ActorRef | null;
  readonly createdAt: string;
}

// --- Settings -----------------------------------------------------------------------

export interface SettingsDocument<T = Readonly<Record<string, unknown>>> {
  readonly key: string;
  readonly value: T;
  /** 0 until the first save; send it back on `PUT` to detect concurrent edits. */
  readonly version: number;
  readonly updatedAt: string | null;
  readonly updatedBy: ActorRef | null;
}

// --- SEO: redirects, 404s, links -------------------------------------------------------

export interface RedirectItem {
  readonly id: string;
  readonly source: string;
  /** Null for 410 (gone). */
  readonly target: string | null;
  readonly statusCode: 301 | 302 | 410;
  /** Created by the CMS when a published entry's address changed. */
  readonly auto: boolean;
  readonly hits: number;
  readonly lastHitAt: string | null;
  readonly note: string | null;
  readonly createdAt: string;
  /** `duplicate`, `chain` or `loop`, from all redirects together. */
  readonly issues: readonly ('duplicate' | 'chain' | 'loop')[];
}

/** `GET /redirects`: what the storefront proxy applies, by normalised source path. */
export interface RedirectMapResponse {
  readonly redirects: readonly {
    readonly source: string;
    readonly target: string | null;
    readonly statusCode: 301 | 302 | 410;
  }[];
}

export interface NotFoundItem {
  readonly id: string;
  readonly path: string;
  readonly hits: number;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly lastReferrer: string | null;
  readonly status: 'open' | 'ignored' | 'resolved';
}

export interface LinkCheckItem {
  readonly id: string;
  readonly url: string;
  readonly internal: boolean;
  readonly result: 'ok' | 'broken' | 'redirected' | 'timeout' | 'blocked';
  readonly httpStatus: number | null;
  /** Where a redirected link ends up, or the redirect that now serves an internal link. */
  readonly finalUrl: string | null;
  readonly message: string | null;
  readonly checkedAt: string;
  readonly entry: { readonly id: string; readonly type: string; readonly title: string };
}

/** `POST /admin/seo/links/scan` (202): the scan runs in the worker. */
export interface LinkScanResponse {
  readonly queued: boolean;
}
