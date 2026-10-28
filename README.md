# Store Frontend

The agency website's storefront: a Next.js 16 marketing site (React 19, Tailwind CSS 4)
and the shared packages it is built from. Content comes from the agency API over HTTP;
the API and the admin dashboard live in their own repository and are not part of this
one.

| Folder                     | What it is                                                         |
| -------------------------- | ------------------------------------------------------------------ |
| `storefront/`              | The Next.js app (see [storefront/README.md](storefront/README.md)) |
| `shared/ui`                | UI primitives (`Container`, buttons, `cx`)                         |
| `shared/validation`        | Zod schemas for every content type and form                        |
| `shared/types`             | API routes, headers and cache tags shared with the API             |
| `shared/config`            | Feature flags and constants                                        |
| `shared/config-eslint`     | ESLint presets                                                     |
| `shared/config-typescript` | TypeScript presets                                                 |
| `shared/scripts`           | Build script for the shared packages                               |

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- pnpm 12.14.0 (pinned in `package.json`): `corepack enable pnpm`

## Run it

```sh
pnpm install   # dependencies and git hooks
pnpm build     # shared packages, then the storefront
pnpm dev       # storefront on http://localhost:3000
```

The storefront reads its content from `API_BASE_URL` (origin only, e.g.
`http://localhost:4000`); see the environment table in
[storefront/README.md](storefront/README.md). Without the real API, run the contract
stand-in the end-to-end tests use and point the storefront at it:

```sh
MOCK_API_PORT=4000 node storefront/e2e/mock-api.ts
```

`pnpm build` needs no API: without `API_BASE_URL` it builds against the same mock.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @agency/storefront test:e2e   # after a build; needs `pnpm exec playwright install chromium` once
```

Commits follow Conventional Commits (checked by commitlint); Prettier runs on staged
files before each commit.
