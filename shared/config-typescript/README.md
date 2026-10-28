# @agency/config-typescript

Shared `tsconfig` presets. Every preset extends `base.json`, which contains the
strict options from architecture doc §13.1 verbatim (plus target/module defaults).

| Preset             | Use for                                 | Module output                  |
| ------------------ | --------------------------------------- | ------------------------------ |
| `base.json`        | Anything (strict core)                  | NodeNext                       |
| `nextjs.json`      | `storefront`, `admin` (Next.js 16)      | none (`noEmit`, bundler)       |
| `nestjs.json`      | `backend` (NestJS 11)                   | CommonJS via NodeNext → `dist` |
| `library.json`     | `shared/*` CommonJS build → `dist/cjs`  | CommonJS                       |
| `library-esm.json` | `shared/*` ES module build → `dist/esm` | ESM                            |

Paths such as `outDir` use `${configDir}`, so they resolve relative to the
consuming project's tsconfig, not to this package.

## Usage

```jsonc
// storefront/tsconfig.json (admin/ is the same)
{
  "extends": "@agency/config-typescript/nextjs.json",
  "compilerOptions": { "paths": { "@/*": ["./src/*"] } },
  "include": ["next-env.d.ts", "src", ".next/types/**/*.ts", "*.config.ts"],
}
```

```jsonc
// backend/tsconfig.json
{
  "extends": "@agency/config-typescript/nestjs.json",
  "include": ["src", "test"],
}
```

Add `"@agency/config-typescript": "workspace:*"` to the app's `devDependencies`.

`nestjs.json` keeps `experimentalDecorators` + `emitDecoratorMetadata` because Nest's
dependency injection reads constructor parameter types at runtime. Do not enable
`verbatimModuleSyntax` or `consistent-type-imports` auto-fixes in the API: turning a
constructor-injected class into a type-only import removes the runtime metadata.
