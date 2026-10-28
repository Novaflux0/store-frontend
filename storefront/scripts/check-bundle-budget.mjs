// First-load JavaScript budget check (doc §6.9: < 170 KB compressed, excluding 3D).
//
// Next.js 16 no longer prints per-route sizes in `next build`, so this script reads
// every prerendered HTML file, collects the <script src> chunks it loads, and sums
// their gzip size. Lazily imported chunks (the 3D scene, Lenis, GSAP for smooth
// scroll, Motion features) are not referenced by the HTML and are reported separately.
//
// Usage: pnpm build && pnpm bundle:check
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 170 * 1024;
const root = process.cwd();
const appDir = join(root, '.next', 'server', 'app');
const staticDir = join(root, '.next', 'static');

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** @type {Map<string, number>} */
const gzipCache = new Map();
/** @param {string} src */
function gzipSize(src) {
  const cached = gzipCache.get(src);
  if (cached !== undefined) return cached;
  const file = join(root, '.next', src.replace(/^\/_next\//, ''));
  const size = gzipSync(readFileSync(file), { level: 9 }).length;
  gzipCache.set(src, size);
  return size;
}

const kb = (/** @type {number} */ bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const pages = walk(appDir).filter((file) => file.endsWith('.html'));
const referenced = new Set();
let failed = false;

console.log(`First-load JS per route (gzip), budget ${kb(BUDGET_BYTES)}\n`);
for (const page of pages.sort()) {
  const html = readFileSync(page, 'utf8');
  // noModule polyfills are skipped: browsers that support ES modules never fetch them.
  const scripts = [...html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"[^>]*>/g)]
    .filter((match) => !/\bnomodule\b/i.test(match[0]))
    .map((match) => match[1]);
  const unique = [...new Set(scripts)];
  for (const src of unique) referenced.add(src);
  const total = unique.reduce((sum, src) => sum + gzipSize(src), 0);
  const ok = total <= BUDGET_BYTES;
  failed ||= !ok;
  const route = `/${relative(appDir, page)
    .replace(/\\/g, '/')
    .replace(/(index)?\.html$/, '')}`;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${route.padEnd(38)} ${kb(total).padStart(9)}`);
}

const lazy = walk(join(staticDir, 'chunks'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => `/_next/${relative(join(root, '.next'), file).replace(/\\/g, '/')}`)
  .filter((src) => !referenced.has(src))
  .map((src) => ({ src, size: gzipSize(src) }))
  .sort((a, b) => b.size - a.size);

console.log('\nLargest lazily loaded chunks (not in any first load):');
for (const { src, size } of lazy.slice(0, 8)) {
  console.log(`  ${kb(size).padStart(9)}  ${src}`);
}
console.log(`  total lazy JS: ${kb(lazy.reduce((sum, chunk) => sum + chunk.size, 0))}`);

if (failed) {
  console.error('\nFirst-load JS budget exceeded.');
  process.exit(1);
}
