import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

// Any attempt to load Zod while this file runs fails the import below.
vi.mock('zod', () => {
  throw new Error('@agency/validation/constants must not import zod');
});

// The package compiles to CommonJS, so `__dirname` / `__filename` (provided by Vitest).
const SRC_DIR = __dirname;
const requireHere = createRequire(__filename);

/** Packages the Zod-free graph may reach; each is scanned from its own `src/index.ts`. */
const ALLOWED_PACKAGES = ['@agency/config', '@agency/types'] as const;

// Static `import`/`export ... from`, side-effect imports, dynamic `import()` and `require()`.
const SPECIFIER =
  /(?:import|export)\s[^'"]*?\sfrom\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function specifiersOf(file: string): string[] {
  // Paths come from this repo's own import graph, not from user input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- test reads workspace sources
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(SPECIFIER)].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
}

function packageEntry(name: string): string {
  const manifest = requireHere.resolve(`${name}/package.json`);
  return join(dirname(manifest), 'src', 'index.ts');
}

/**
 * Walks the source module graph from `entry`, following relative imports
 * (`./x.js` -> `./x.ts`) and allowed workspace packages. Returns every file
 * visited and every bare import that is not allowed.
 */
function walkModuleGraph(entry: string) {
  const visited = new Set<string>();
  const forbidden = new Set<string>();
  const pending = [entry];
  for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
    if (visited.has(file)) continue;
    visited.add(file);
    for (const specifier of specifiersOf(file)) {
      if (specifier.startsWith('.')) {
        pending.push(resolve(dirname(file), specifier).replace(/\.js$/, '.ts'));
      } else if ((ALLOWED_PACKAGES as readonly string[]).includes(specifier)) {
        pending.push(packageEntry(specifier));
      } else {
        forbidden.add(`${specifier} (imported by ${file})`);
      }
    }
  }
  return { visited: [...visited], forbidden: [...forbidden] };
}

describe('@agency/validation/constants', () => {
  it('reaches no package except @agency/config and @agency/types, so never zod (static module graph)', () => {
    const { visited, forbidden } = walkModuleGraph(join(SRC_DIR, 'constants.ts'));
    expect(forbidden).toEqual([]);
    // Sanity: the walk really followed the re-exports and the config package.
    const names = visited.map((file) => file.replaceAll('\\', '/'));
    expect(names).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/validation\/src\/lead-options\.ts$/),
        expect.stringMatching(/validation\/src\/upload-policy\.ts$/),
        expect.stringMatching(/validation\/src\/limits\.ts$/),
        expect.stringMatching(/config\/src\/uploads\.ts$/),
      ]),
    );
  });

  it('flags a zod import when the graph contains one (the scan is not vacuous)', () => {
    const { forbidden } = walkModuleGraph(join(SRC_DIR, 'files.ts'));
    expect(forbidden.some((entry) => entry.startsWith('zod '))).toBe(true);
  });

  it('fails to load a schema module, proving the zod trap is armed', async () => {
    await expect(import('./files.js')).rejects.toThrow();
  });

  it('loads at runtime without loading zod', async () => {
    const constants = await import('./constants.js');
    expect(constants.SERVICE_OPTIONS).toContain('web-design');
    expect(constants.BUDGET_OPTIONS).toContain('not-sure');
    expect(constants.TIMELINE_OPTIONS).toContain('asap');
    expect(constants.LEAD_KINDS).toEqual(['contact', 'inquiry']);
    expect(constants.FIELD_LIMITS.messageMax).toBe(5000);
    expect(constants.PAGINATION.defaultLimit).toBe(20);
    expect(constants.OPAQUE_TOKEN_LENGTH).toBe(43);
    expect(constants.UPLOAD_PURPOSES).toEqual(['cv', 'project', 'media']);
    expect(constants.ALLOWED_UPLOAD_MIME.cv.mimeTypes).toContain(constants.MIME_TYPES.pdf);
    expect(constants.isAllowedUpload('cv', constants.MIME_TYPES.pdf, 1024)).toBe(true);
  });
});
