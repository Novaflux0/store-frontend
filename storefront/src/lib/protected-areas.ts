import { isFeatureEnabled, type FeatureFlag, type FeatureFlagEnv } from '@agency/config';

/**
 * Route prefixes that stay closed until their feature flag is switched on (R1).
 * The admin dashboard is a separate app (`admin/`, ADR 0014), so it has no entry here.
 */
const AREA_FLAGS: readonly (readonly [prefix: string, flag: FeatureFlag])[] = [
  ['/portal', 'clientPortal'],
];

/** Feature flag guarding a path, or `null` for public paths. */
export function flagForPath(pathname: string): FeatureFlag | null {
  for (const [prefix, flag] of AREA_FLAGS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return flag;
  }
  return null;
}

/** Deny by default: true when the path belongs to an area whose flag is off. */
export function isAreaClosed(pathname: string, env: FeatureFlagEnv): boolean {
  const flag = flagForPath(pathname);
  return flag !== null && !isFeatureEnabled(flag, env);
}
