/**
 * Error body for every non-2xx API response (RFC 9457 "Problem Details for HTTP
 * APIs"), served as `application/problem+json`. Messages are safe for end users:
 * no stack traces, SQL or internal identifiers (doc §13.4).
 */
export interface ProblemDetails {
  /**
   * URI identifying the problem type, e.g. `https://api.agency.com/errors/validation-error`.
   * The last path segment is one of `PROBLEM_TYPES`.
   */
  readonly type: string;
  /** Short, human-readable summary of the problem type. */
  readonly title: string;
  /** HTTP status code, repeated for clients that only see the body. */
  readonly status: number;
  /** Human-readable explanation of this occurrence. */
  readonly detail: string;
  /** URI of this occurrence, typically the request path. */
  readonly instance?: string;
  /** Correlates the response with logs and traces (doc §9.13). */
  readonly traceId: string;
  /**
   * Field-level validation errors keyed by dot-separated field path
   * (`"email"`, `"items.0.name"`), each with one or more messages.
   */
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';
