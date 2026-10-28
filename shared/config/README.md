# @agency/config

Shared runtime constants from the architecture doc and typed feature flags. Its only
dependency is `@agency/types` (for `Role`), and it uses no Node-only APIs, so it runs in the API, the worker, Next.js server
code and the browser.

## Exports

| Export                                                                                                       | Value                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RATE_LIMITS`                                                                                                | `{ limit, ttlMs }` per rule (doc §9.10): `global` 100/min, `login` 5 per 15 min, `passwordReset` 3/hour, `forms` 3 per 10 min, `uploadUrl` 30/hour. Maps onto @nestjs/throttler `{ limit, ttl }`.                         |
| `PERMISSIONS`, `Permission`, `ROLE_PERMISSIONS`, `can(role, permission)`, `isPermission()`                   | Admin permission matrix (ADR 0014): Super Admin everything; Admin everything except `team.manage` and `security.manage`; Staff `dashboard.view`, `content.edit`, `media.upload`, `leads.view`, `leads.notes`; Client none |
| `TOKEN_TTL`                                                                                                  | Seconds: `accessSeconds` 900, `refreshSeconds` 7 days, `refreshRememberMeSeconds` 30 days, `signedUrlSeconds` 300                                                                                                         |
| `REQUEST_TIMEOUT_MS`                                                                                         | `10_000`                                                                                                                                                                                                                  |
| `JSON_BODY_LIMIT`                                                                                            | `'100kb'`                                                                                                                                                                                                                 |
| `IDEMPOTENCY_KEY_TTL_SECONDS`                                                                                | `86_400` (24 hours)                                                                                                                                                                                                       |
| `HIBP_TIMEOUT_MS`                                                                                            | `2_000` (ADR 0009)                                                                                                                                                                                                        |
| `CLIENT_IP_SIGNATURE_MAX_AGE_MS`                                                                             | `60_000` (ADR 0006)                                                                                                                                                                                                       |
| `UPLOAD_PURPOSES`, `UploadPurpose`                                                                           | `['cv', 'project', 'media']`                                                                                                                                                                                              |
| `UPLOAD_LIMITS`                                                                                              | `cv.maxBytes` 10 MiB, `project.maxBytes` 100 MiB, `media.maxBytes` 15 MiB                                                                                                                                                 |
| `FEATURE_FLAGS`, `FeatureFlag`                                                                               | `'clientPortal' \| 'passkeys'` (the admin dashboard is the separate `admin/` app, not a flag)                                                                                                                             |
| `FEATURE_FLAG_DEFAULTS`                                                                                      | all `false`                                                                                                                                                                                                               |
| `featureFlagEnvKey(flag)`                                                                                    | `'clientPortal'` to `'FEATURE_CLIENT_PORTAL'`                                                                                                                                                                             |
| `isFeatureEnabled(flag, env)`                                                                                | Reads `FEATURE_<UPPER_SNAKE>`; `true/1/on/yes` and `false/0/off/no` (case-insensitive), anything else uses the default (off)                                                                                              |
| `getFeatureFlags(env)`                                                                                       | All flags at once                                                                                                                                                                                                         |
| `MS_PER_SECOND`, `SECONDS_PER_MINUTE`, `SECONDS_PER_HOUR`, `SECONDS_PER_DAY`, `minutesToMs()`, `hoursToMs()` | Unit helpers                                                                                                                                                                                                              |

```ts
import { isFeatureEnabled, RATE_LIMITS } from '@agency/config';

if (!isFeatureEnabled('clientPortal', process.env)) notFound();
```

Pass the env object explicitly: Next.js only inlines literal `process.env.NAME`
reads, so read flags on the server and pass the result to client components.

## Build

Same dual CommonJS / ESM build as `@agency/validation`; see its README.
