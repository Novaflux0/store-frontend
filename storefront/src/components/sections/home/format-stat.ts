const FORMATS = new Map<number, Intl.NumberFormat>();

/** `1234.5, 1, '+'` -> `1,234.5+`. Fixed decimals, so the width barely changes mid-count. */
export function formatStat(value: number, decimals: number, suffix: string): string {
  let format = FORMATS.get(decimals);
  if (!format) {
    format = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    FORMATS.set(decimals, format);
  }
  return `${format.format(value)}${suffix}`;
}

/** Ease-out cubic: fast start, gentle landing on the final value. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}
