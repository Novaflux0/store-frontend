// Builds a shared library package twice so both apps get a native format:
//   dist/cjs  CommonJS + .d.ts  -> backend (NestJS 11 compiles to CommonJS)
//   dist/esm  ES modules + .d.ts -> storefront and admin (Next.js bundles ESM and tree-shakes it)
// Shipping only CommonJS would make Next.js bundle zod's CommonJS build next to the
// ESM build it already uses, duplicating it in the client bundle.
//
// Every file of every src module is emitted, so subpath exports (e.g.
// `@agency/validation/constants`) only need an entry in package.json `exports`;
// the check at the end fails the build if an export points at a missing file.
//
// Usage (from a package directory): node ../scripts/build-package.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const packageDir = process.cwd();
const requireFromPackage = createRequire(join(packageDir, 'package.json'));
const tscBin = requireFromPackage.resolve('typescript/bin/tsc');
const distDir = join(packageDir, 'dist');

// A clean build avoids stale files from renamed or deleted modules.
rmSync(distDir, { recursive: true, force: true });

for (const tsconfig of ['tsconfig.build.json', 'tsconfig.build.esm.json']) {
  execFileSync(process.execPath, [tscBin, '--project', tsconfig], {
    cwd: packageDir,
    stdio: 'inherit',
  });
}

// Mark each output folder's module format so Node and bundlers read .js correctly
// regardless of the package's own "type" field.
const formats = { cjs: 'commonjs', esm: 'module' };
for (const [folder, type] of Object.entries(formats)) {
  const dir = join(distDir, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`);
}

// Fail fast when package.json `exports` names a file the build did not produce
// (a renamed module, or a subpath added to `exports` without a matching src file).
function exportTargets(entry) {
  if (typeof entry === 'string') return [entry];
  if (entry === null || typeof entry !== 'object') return [];
  return Object.values(entry).flatMap(exportTargets);
}
const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
// Pattern targets (`./dist/*.js`) cannot be checked file by file and are skipped.
const missing = exportTargets(manifest.exports ?? {}).filter(
  (target) => !target.includes('*') && !existsSync(join(packageDir, target)),
);
if (missing.length > 0) {
  console.error(`build-package: exports point at missing files:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
