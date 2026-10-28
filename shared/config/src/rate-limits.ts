import { hoursToMs, minutesToMs } from './duration.js';

/** A fixed-window limit: at most `limit` requests per `ttlMs` milliseconds. */
export interface RateLimitRule {
  readonly limit: number;
  readonly ttlMs: number;
}

/**
 * Application-level rate limits (doc §9.10). Cloudflare applies broader edge
 * limits in front of these. The API stores counters in Valkey so limits hold
 * across all containers. Maps directly onto @nestjs/throttler `{ limit, ttl }`.
 */
export const RATE_LIMITS = {
  /** Every API route, per user or client IP. */
  global: { limit: 100, ttlMs: minutesToMs(1) },
  /** Login attempts, per account and per IP. */
  login: { limit: 5, ttlMs: minutesToMs(15) },
  /** Password-reset requests, per email address. */
  passwordReset: { limit: 3, ttlMs: hoursToMs(1) },
  /** Contact, inquiry, newsletter and careers forms, per IP (plus Turnstile). */
  forms: { limit: 3, ttlMs: minutesToMs(10) },
  /** Presigned upload URL requests, per user (or per IP when anonymous). */
  uploadUrl: { limit: 30, ttlMs: hoursToMs(1) },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;
