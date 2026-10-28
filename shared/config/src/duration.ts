// Named unit conversions so limits below read as "15 minutes", not 900_000.
export const MS_PER_SECOND = 1_000;
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export const minutesToMs = (minutes: number): number =>
  minutes * SECONDS_PER_MINUTE * MS_PER_SECOND;
export const hoursToMs = (hours: number): number => hours * SECONDS_PER_HOUR * MS_PER_SECOND;
