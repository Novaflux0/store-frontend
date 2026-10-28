# @agency/validation

The wire contract: Zod v4 schemas for every public request body and query,
shared by the web forms (`storefront`) and the NestJS API (`backend`). See
[ADR 0011](../../docs/adr/0011-shared-zod-validation-nestjs-zod.md).

## Rules every schema follows

- Objects are `z.strictObject`: unknown fields are rejected (`forbidNonWhitelisted`).
- Strings are trimmed and have a maximum length (`FIELD_LIMITS`); emails are lowercased.
- Optional form fields that need a format (phone, portfolio URL) also accept `""`,
  meaning "not provided" (HTML forms submit `""`). The API stores `""` as `null`.
- No transforms that change the type, so every schema converts to JSON Schema / OpenAPI.

## Exports

Two entry points:

| Entry                          | Contents                                                     | Loads Zod |
| ------------------------------ | ------------------------------------------------------------ | --------- |
| `@agency/validation`           | Everything: the schemas and every constant below             | yes       |
| `@agency/validation/constants` | Only the Zod-free values (option lists, limits, upload rule) | no        |

| Module     | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| common     | `emailSchema`, `nameSchema`, `turnstileTokenSchema`, `uuidV7Schema`, `opaqueTokenSchema`, `slugSchema`, `httpsUrlSchema`, `phoneSchema`, `consentSchema`, `optionalField()`, `cursorQuerySchema`, type `CursorQuery`                                                                                                                                                                                                                                                |
| leads      | `contactLeadSchema`, `inquiryLeadSchema`, `createLeadSchema` (discriminated union on `kind`), types `ContactLeadInput`, `InquiryLeadInput`, `CreateLeadInput`; re-exports the lead option lists below                                                                                                                                                                                                                                                               |
| newsletter | `newsletterSubscribeSchema` (`{ email, turnstileToken }`), `newsletterConfirmSchema` and `newsletterUnsubscribeSchema` (both `{ token }`), `newsletterTokenSchema` (the shared `{ token }` shape), types `NewsletterSubscribeInput`, `NewsletterConfirmInput`, `NewsletterUnsubscribeInput`, `NewsletterTokenInput`                                                                                                                                                 |
| careers    | `jobApplicationSchema`, type `JobApplicationInput`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| auth       | `passwordSchema` (12-128), `totpCodeSchema`, `recoveryCodeSchema`, `loginSchema`, `mfaVerifySchema`, `mfaEnrollStartSchema`, `mfaEnrollConfirmSchema`, `refreshTokenSchema`, `stepUpSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `acceptInvitationSchema`, `updateProfileSchema`, `changePasswordSchema`, `inviteStaffSchema`, `updateStaffSchema`, and their `*Input` types                                                                             |
| admin      | List queries and updates for the admin API: `leadsQuerySchema`, `updateLeadSchema`, `leadNoteSchema`, `subscribersQuerySchema`, `applicationsQuerySchema`, `updateApplicationSchema`, `auditQuerySchema`, `staffQuerySchema`, `idParamSchema`, and their types                                                                                                                                                                                                      |
| rich-text  | `richTextDocSchema` (TipTap JSON with a node/mark allow-list, safe link and image URLs, depth and size limits), `richTextToPlainText()`, types `RichTextDoc`, `RichTextNode`, `RichTextMark`                                                                                                                                                                                                                                                                        |
| content    | Per-type data schemas (`blogPostDataSchema`, `caseStudyDataSchema`, `jobDataSchema`, `serviceDataSchema`, `teamMemberDataSchema`, `testimonialDataSchema`, `pricingPlanDataSchema`, `homePageDataSchema`, `standardPageDataSchema`, `legalPageDataSchema`), `contentDataSchema(type, slug)`, `createContentSchema`, `updateContentSchema`, `scheduleContentSchema`, `contentListQuerySchema`, shared fields (`imageSchema`, `linkSchema`, `seoOverrideSchema`, ...) |
| settings   | One schema per key (`siteSettingsSchema`, `navigationSettingsSchema`, `seoSettingsSchema`, `featureSettingsSchema`, `notificationSettingsSchema`, `securitySettingsSchema`: 2FA cannot be turned off, lifetimes are bounded), `SETTINGS` (key to schema), `updateSettingsSchema`                                                                                                                                                                                    |
| media      | `altTextSchema`, `mediaUploadRequestSchema` (JPEG, PNG, WebP, AVIF; no SVG), `createMediaSchema`, `updateMediaSchema`, `mediaQuerySchema`                                                                                                                                                                                                                                                                                                                           |
| files      | `fileNameSchema`, `requestUploadSchema` (signed-in users, any purpose), `publicUploadRequestSchema` (anonymous: `purpose: 'cv'` only, plus `turnstileToken`), types `RequestUploadInput`, `PublicUploadRequestInput`; re-exports the upload policy below                                                                                                                                                                                                            |

### `@agency/validation/constants` (Zod-free)

| Source module    | Exports                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lead-options`   | `LEAD_KINDS`, `SERVICE_OPTIONS`, `BUDGET_OPTIONS`, `TIMELINE_OPTIONS`, types `LeadKind`, `ServiceOption`, `BudgetOption`, `TimelineOption`                                                                                                                                    |
| `limits`         | `FIELD_LIMITS`, `PAGINATION`, `OPAQUE_TOKEN_LENGTH`                                                                                                                                                                                                                           |
| `upload-policy`  | `MIME_TYPES`, `ALLOWED_UPLOAD_MIME`, `isAllowedUpload()`, type `UploadPolicy`                                                                                                                                                                                                 |
| `admin-options`  | `CONTENT_TYPES`, `PAGE_SLUGS`, `LEGAL_PAGE_SLUGS`, `CONTENT_STATUSES`, `SETTINGS_KEYS`, `PUBLIC_SETTINGS_KEYS`, lead/application/subscriber/staff statuses, `EMPLOYMENT_TYPES`, `SALARY_UNITS`, `PRICE_PERIODS`, `SOCIAL_PLATFORMS`, `PASSWORD_LIMITS`, `RECOVERY_CODE_COUNT` |
| `@agency/config` | `UPLOAD_PURPOSES`, type `UploadPurpose` (re-exported)                                                                                                                                                                                                                         |

The root entry re-exports all of these too, so existing imports keep working.

### Which entry to import

- **Browser code that only needs values** (select options, `maxLength`, a file
  pre-check before requesting an upload URL): import from
  `@agency/validation/constants`. Importing a value from the root pulls the whole
  Zod runtime into that bundle, which matters for the 170 KB first-load budget.
- **Schemas** (Server Actions, the API, a lazily loaded form resolver): import from
  the root, `@agency/validation`.
- **Types only** (`import type { CreateLeadInput } ...`): either entry; type imports
  are erased and never load Zod.

`constants.ts` and everything it imports must never import `zod`.
`src/constants.test.ts` enforces this two ways: it walks the source import graph
(including `@agency/config`) and fails on any package other than `@agency/config`,
and it imports the module with `zod` mocked to throw.

## Usage

```ts
// storefront: option lists without Zod
import { FIELD_LIMITS, SERVICE_OPTIONS } from '@agency/validation/constants';
```

```ts
// storefront: React Hook Form
import { zodResolver } from '@hookform/resolvers/zod';
import { createLeadSchema } from '@agency/validation';

useForm({ resolver: zodResolver(createLeadSchema) });
```

```ts
// backend: nestjs-zod DTO
import { createZodDto } from 'nestjs-zod';
import { createLeadSchema } from '@agency/validation';

export class CreateLeadDto extends createZodDto(createLeadSchema) {}
```

## Build format (why both CommonJS and ESM)

`pnpm build` compiles `src/` twice with `tsc` (see `shared/scripts/build-package.mjs`):

- `dist/cjs`: CommonJS + `.d.ts`, picked by the `require` condition. NestJS 11
  compiles to CommonJS, so the API loads this build natively.
- `dist/esm`: ES modules + `.d.ts`, picked by the `import` condition. Next.js 16
  bundles and tree-shakes this build. Shipping only CommonJS would make the web bundle
  include Zod's CommonJS build next to the ESM build it already uses.

Both formats contain every `src/` module, so a subpath export such as
`./constants` only needs an entry in `package.json` `exports` (with `import` and
`require`, each with `types` and `default`). The build fails if an `exports` target
is missing.

The package must be built before an app type-checks or runs against it. Turbo does
this automatically: every `build`, `dev`, `lint`, `typecheck` and `test` task depends
on `^build`. Tests run against `src/` directly.

## Scripts

`pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test` (Vitest with an 80% coverage threshold)
