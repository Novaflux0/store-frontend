// Zod-free: the redirect rules shared by the API (enforcement), the storefront proxy
// (lookup) and the dashboard (live warnings). Re-exported by `/constants`.

/** 301 moved permanently, 302 moved temporarily, 410 gone for good (no target). */
export const REDIRECT_STATUS_CODES = [301, 302, 410] as const;
export type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number];

export const REDIRECT_PATH_MAX = 500;
export const REDIRECT_TARGET_MAX = 2048;
/** Hops followed when resolving a chain; more than this is reported as a loop. */
export const REDIRECT_MAX_HOPS = 10;

/** Paths the site itself owns: they can never be redirected. */
const RESERVED_PREFIXES = ['/api', '/_next'] as const;

/**
 * The canonical form of a site path for redirects and 404 tracking: lower case, no
 * query or fragment, single slashes, no trailing slash. `null` when it is not a path
 * the proxy can redirect: the home page, the app's own routes (`/api`, `/_next`),
 * dot segments, backslashes, whitespace, or a file extension (files are served
 * directly and never reach the proxy).
 */
export function normalizeRedirectPath(input: string): string | null {
  const raw = input.trim().split(/[?#]/, 1)[0] ?? '';
  if (!raw.startsWith('/') || /[\s\\]/.test(raw)) return null;
  let path: string;
  try {
    path = decodeURI(raw);
  } catch {
    return null;
  }
  path = path
    .toLowerCase()
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
  if (path === '' || path.length > REDIRECT_PATH_MAX) return null;
  const segments = path.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) return null;
  if (/\.[a-z0-9]+$/.test(segments.at(-1) ?? '')) return null;
  if (RESERVED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }
  return path;
}

/**
 * A redirect target: a site path (normalised like a source, but query and fragment
 * kept, e.g. `/contact?topic=seo`) or a full https URL. `null` when invalid.
 */
export function normalizeRedirectTarget(input: string): string | null {
  const target = input.trim();
  if (target.length === 0 || target.length > REDIRECT_TARGET_MAX || /[\s\\"<>]/.test(target)) {
    return null;
  }
  if (/^https:\/\//i.test(target)) {
    // The scheme and host are case-insensitive, so they are lowered; the path is kept.
    const rest = target.slice('https://'.length);
    const slash = rest.indexOf('/');
    const host = (slash === -1 ? rest : rest.slice(0, slash)).toLowerCase();
    const [name = '', port, extra] = host.split(':');
    const validName =
      /^[a-z0-9.-]+$/.test(name) &&
      name.includes('.') &&
      !name.startsWith('.') &&
      !name.includes('..');
    const validPort = port === undefined || /^\d{1,5}$/.test(port);
    if (!validName || !validPort || extra !== undefined) return null;
    return `https://${host}${slash === -1 ? '/' : rest.slice(slash)}`;
  }
  if (/^https?:/i.test(target) || !target.startsWith('/')) return null;
  if (target === '/') return '/';
  const cut = target.search(/[?#]/);
  const path = normalizeRedirectPath(cut === -1 ? target : target.slice(0, cut));
  return path === null ? null : `${path}${cut === -1 ? '' : target.slice(cut)}`;
}

export interface RedirectRule {
  readonly id: string;
  readonly source: string;
  readonly target: string | null;
  readonly statusCode: RedirectStatusCode;
}

export type RedirectIssue = 'duplicate' | 'chain' | 'loop';

/** The source path a target leads to on this site, or null for external and 410. */
function nextHop(target: string | null): string | null {
  if (!target?.startsWith('/')) return null;
  return normalizeRedirectPath(target);
}

/**
 * Problems in a set of redirects, by rule id:
 * - `duplicate`: another rule has the same source (only one can ever apply);
 * - `chain`: the target is itself redirected (visitors and crawlers take extra hops);
 * - `loop`: following the targets comes back to a source already visited.
 */
export function detectRedirectIssues(
  rules: readonly RedirectRule[],
): ReadonlyMap<string, readonly RedirectIssue[]> {
  const issues = new Map<string, RedirectIssue[]>();
  const add = (id: string, issue: RedirectIssue) => {
    const list = issues.get(id) ?? [];
    if (!list.includes(issue)) list.push(issue);
    issues.set(id, list);
  };
  const bySource = new Map<string, RedirectRule[]>();
  for (const rule of rules) {
    bySource.set(rule.source, [...(bySource.get(rule.source) ?? []), rule]);
  }
  for (const group of bySource.values()) {
    if (group.length > 1) for (const rule of group) add(rule.id, 'duplicate');
  }
  for (const rule of rules) {
    const first = nextHop(rule.target);
    if (first === null || !bySource.has(first)) continue;
    const seen = new Set([rule.source]);
    let current: string | null = first;
    let loop = false;
    for (let hop = 0; current !== null && bySource.has(current); hop += 1) {
      if (seen.has(current) || hop >= REDIRECT_MAX_HOPS) {
        loop = true;
        break;
      }
      seen.add(current);
      current = nextHop(bySource.get(current)?.[0]?.target ?? null);
    }
    add(rule.id, loop ? 'loop' : 'chain');
  }
  return issues;
}

/**
 * Where a path finally leads after following every redirect: the last target and the
 * status the visitor should get (301 unless any hop is temporary, 410 if gone).
 * `null` when the path is not redirected or the chain loops.
 */
export function resolveRedirect(
  rules: readonly RedirectRule[],
  source: string,
): { target: string | null; statusCode: RedirectStatusCode } | null {
  const bySource = new Map(rules.map((rule) => [rule.source, rule]));
  let rule = bySource.get(source);
  if (rule === undefined) return null;
  let statusCode: RedirectStatusCode = rule.statusCode;
  const seen = new Set([source]);
  for (let hop = 0; hop < REDIRECT_MAX_HOPS; hop += 1) {
    if (rule.statusCode === 410) return { target: null, statusCode: 410 };
    if (rule.statusCode === 302) statusCode = 302;
    const next = nextHop(rule.target);
    const following = next === null ? undefined : bySource.get(next);
    if (following === undefined) return { target: rule.target, statusCode };
    if (seen.has(following.source)) return null;
    seen.add(following.source);
    rule = following;
  }
  return null;
}
