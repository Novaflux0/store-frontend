import 'server-only';

import { REQUEST_TIMEOUT_MS } from '@agency/config';
import {
  PROBLEM_JSON_CONTENT_TYPE,
  apiPath,
  type ApiRoute,
  type ProblemDetails,
} from '@agency/types';

import type { ApiGetContract, ApiGetRoute, ApiPostContract, ApiPostRoute } from './api-contract';
import { getServerEnv } from './env/server';

/**
 * The single typed client for the NestJS API (doc §6.6). Server-side only: it holds
 * the API origin and is called from Server Actions and Server Components.
 */

export type ApiErrorKind = 'http' | 'timeout' | 'network' | 'invalid-response';

/**
 * Failed API call. `problem` is the parsed RFC 9457 body when the API sent one.
 * The message is for logs only; map errors to user-facing copy at the call site.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    readonly problem: ProblemDetails | null = null,
    options?: ErrorOptions,
  ) {
    super(
      problem
        ? `API ${status.toString()} ${problem.title} (traceId ${problem.traceId})`
        : `API request failed: ${kind} ${status.toString()}`,
      options,
    );
  }
}

export interface ApiRequestOptions {
  /** Extra request headers (signed client IP, idempotency key, …). */
  readonly headers?: Readonly<Record<string, string>>;
  /** Defaults to `REQUEST_TIMEOUT_MS` (10 s), matching the API's own timeout. */
  readonly timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (messages) => Array.isArray(messages) && messages.every((m) => typeof m === 'string'),
    )
  );
}

/** Narrows an unknown JSON body to `ProblemDetails`. */
export function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    typeof value.title === 'string' &&
    typeof value.status === 'number' &&
    typeof value.detail === 'string' &&
    typeof value.traceId === 'string' &&
    (value.errors === undefined || isStringArrayRecord(value.errors))
  );
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes(PROBLEM_JSON_CONTENT_TYPE)) return null;
  try {
    const body: unknown = await response.json();
    return isProblemDetails(body) ? body : null;
  } catch {
    return null;
  }
}

async function apiRequest<TResponse>(
  method: 'GET' | 'POST',
  route: ApiRoute,
  body: unknown,
  { headers = {}, timeoutMs = REQUEST_TIMEOUT_MS }: ApiRequestOptions,
): Promise<TResponse> {
  const url = new URL(apiPath(route), getServerEnv().API_BASE_URL);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: `application/json, ${PROBLEM_JSON_CONTENT_TYPE}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? null : JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiError(timedOut ? 'timeout' : 'network', 0, null, { cause: error });
  }

  if (!response.ok) {
    throw new ApiError('http', response.status, await readProblem(response));
  }
  if (response.status === 204) return undefined as TResponse;

  try {
    return (await response.json()) as TResponse;
  } catch (error) {
    throw new ApiError('invalid-response', response.status, null, { cause: error });
  }
}

/**
 * `POST` a JSON body to an API route. Body and response types come from
 * `ApiPostContract`, so `apiPost(API_ROUTES.leads, lead)` only accepts a
 * `CreateLeadInput` and resolves to a `CreateLeadResponse`.
 */
export function apiPost<TRoute extends ApiPostRoute>(
  route: TRoute,
  body: ApiPostContract[TRoute]['body'],
  options: ApiRequestOptions = {},
): Promise<ApiPostContract[TRoute]['response']> {
  return apiRequest('POST', route, body, options);
}

/** `GET` an API route; the response type comes from `ApiGetContract`. */
export function apiGet<TRoute extends ApiGetRoute>(
  route: TRoute,
  options: ApiRequestOptions = {},
): Promise<ApiGetContract[TRoute]> {
  return apiRequest('GET', route, undefined, options);
}

/**
 * The problem slug (`PROBLEM_TYPES` value) of a failed call: the last path segment
 * of `problem.type`, e.g. `upload-not-found`. `null` without a problem body.
 */
export function problemSlug(error: ApiError): string | null {
  const type = error.problem?.type;
  if (!type) return null;
  return type.split(/[/#]/).pop() ?? null;
}
