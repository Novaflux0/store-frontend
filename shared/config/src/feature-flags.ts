/**
 * Typed feature flags (plan finding A18). Values come from environment variables
 * named `FEATURE_<UPPER_SNAKE_CASE>` (for example `FEATURE_CLIENT_PORTAL=true`),
 * which Infisical injects per environment. Every flag defaults to off, so a
 * missing or mistyped variable can never switch an unfinished feature on.
 */
export const FEATURE_FLAGS = ['clientPortal', 'passkeys'] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export const FEATURE_FLAG_DEFAULTS: Readonly<Record<FeatureFlag, boolean>> = {
  clientPortal: false,
  passkeys: false,
};

/** Shape of `process.env`, kept structural so this package has no Node types. */
export type FeatureFlagEnv = Readonly<Record<string, string | undefined>>;

const ENABLED_VALUES: ReadonlySet<string> = new Set(['true', '1', 'on', 'yes']);
const DISABLED_VALUES: ReadonlySet<string> = new Set(['false', '0', 'off', 'no']);

/** `clientPortal` -> `FEATURE_CLIENT_PORTAL`. */
export function featureFlagEnvKey(flag: FeatureFlag): string {
  const upperSnake = flag.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
  return `FEATURE_${upperSnake}`;
}

/**
 * Reads one flag from an env object. The env is passed in explicitly because
 * Next.js only inlines literal `process.env.X` reads; call this on the server.
 * Unrecognised values fall back to the default instead of throwing, so a typo
 * keeps the feature off rather than taking the app down.
 */
export function isFeatureEnabled(flag: FeatureFlag, env: FeatureFlagEnv): boolean {
  const raw = env[featureFlagEnvKey(flag)]?.trim().toLowerCase();
  if (raw === undefined) return FEATURE_FLAG_DEFAULTS[flag];
  if (ENABLED_VALUES.has(raw)) return true;
  if (DISABLED_VALUES.has(raw)) return false;
  return FEATURE_FLAG_DEFAULTS[flag];
}

/** Resolves every flag at once, e.g. to pass a snapshot to the client. */
export function getFeatureFlags(env: FeatureFlagEnv): Readonly<Record<FeatureFlag, boolean>> {
  return {
    clientPortal: isFeatureEnabled('clientPortal', env),
    passkeys: isFeatureEnabled('passkeys', env),
  };
}
