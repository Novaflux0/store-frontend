# @agency/config-eslint

Shared ESLint 10 flat configs built on typescript-eslint, with type-aware linting
(`projectService: true`).

| Export | For                   | Adds                                                                                                                            |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `base` | `shared/*`            | `@eslint/js` recommended, typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`, eslint-plugin-security, project rules |
| `next` | `storefront`, `admin` | `base` rules + eslint-plugin-react, react-hooks, jsx-a11y, browser globals                                                      |
| `nest` | `backend`             | `base` rules + Node globals, decorator-friendly rules                                                                           |

Rules required by the architecture doc, enforced in every preset:

- `@typescript-eslint/no-explicit-any: error` (§13.1).
- `$queryRawUnsafe` / `$executeRawUnsafe` are banned for member access, computed access and destructuring (§9.8).
- `react/no-danger: error` bans `dangerouslySetInnerHTML` (`next` preset, §9.5).
- `no-console: warn`, allowing only `console.error` and `console.warn` (§13.6). Lint scripts use `--max-warnings=0`, so CI fails on warnings.
- `eslint-plugin-security` recommended rules. `detect-object-injection` is off: with `noUncheckedIndexedAccess` its findings are false positives.
- `eslint-config-prettier` is always the last entry.

ESLint 10 is used because ESLint 9 is end-of-life. `eslint-plugin-react` 7.37 and
`eslint-plugin-jsx-a11y` 6.10 have not widened their peer range to ESLint 10 yet; both
were verified to work and the root `pnpm-workspace.yaml` accepts the peer explicitly
(`peerDependencyRules`).

The `next` preset sets `settings.react.version` explicitly: eslint-plugin-react's
`'detect'` calls `context.getFilename()`, which ESLint 10 removed. The version is read
from `react/package.json` as resolved from ESLint's working directory (the consuming
project) when the config loads, falling back to `19.0`. Consumers need no override.

## Usage

Add `"@agency/config-eslint": "workspace:*"` and `"eslint": "catalog:"` to `devDependencies`.

```js
// backend/eslint.config.mjs
import { nest } from '@agency/config-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(nest, {
  languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
});
```

```js
// storefront/eslint.config.mjs (admin/ is the same)
import { next } from '@agency/config-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';

export default defineConfig(next, nextPlugin.configs['core-web-vitals'], {
  languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
});
```

Every linted `.ts` / `.tsx` file must be included by the package's `tsconfig.json`,
because the project service reports files it cannot find. `.js` / `.mjs` / `.cjs` files
are linted without type information.

If an app overrides `no-restricted-properties`, it must re-include the raw-SQL
entries: ESLint replaces a rule's options rather than merging them.
