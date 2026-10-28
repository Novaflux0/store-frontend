'use server';

import { headers } from 'next/headers';
import { z } from 'zod';

import { API_HEADERS, API_ROUTES } from '@agency/types';
import { createLeadSchema } from '@agency/validation';

import { getSettings } from '@/content/registry';
import { ApiError, apiPost } from '@/lib/api';
import { getServerEnv } from '@/lib/env/server';
import { clientIpHeaders, getClientIp } from '@/lib/security/client-ip';

import { toLeadResult, type SubmitLeadResult } from './lead-result';

const idempotencyKeySchema = z.uuid();

/** The inbox to suggest when the form fails; settings may be unreachable too. */
async function contactEmail(): Promise<string> {
  try {
    return (await getSettings()).site.email;
  } catch {
    return 'our team';
  }
}

/**
 * Server Action behind the contact / project-inquiry form (doc §5.5 flow 2).
 * Never trusts the browser: the payload is validated again with the shared schema,
 * then forwarded to `POST /api/v1/leads` with an `Idempotency-Key` and the signed
 * visitor IP (ADR 0006).
 */
export async function submitLead(
  input: unknown,
  idempotencyKey: unknown,
): Promise<SubmitLeadResult> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return toLeadResult({ kind: 'invalid', error: parsed.error });
  }

  // The browser generates the key so retries of the same submission reuse it.
  const key = idempotencyKeySchema.safeParse(idempotencyKey);
  const requestHeaders = await headers();

  try {
    const { CLIENT_IP_HMAC_SECRET, EDGE_AUTH_SECRET } = getServerEnv();
    await apiPost(API_ROUTES.leads, parsed.data, {
      headers: {
        [API_HEADERS.idempotencyKey]: key.success ? key.data : crypto.randomUUID(),
        ...clientIpHeaders(getClientIp(requestHeaders, EDGE_AUTH_SECRET), CLIENT_IP_HMAC_SECRET),
      },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('[submitLead] API call failed', {
        kind: error.kind,
        status: error.status,
        traceId: error.problem?.traceId,
      });
      return toLeadResult({ kind: 'api', status: error.status, problem: error.problem });
    }
    console.error('[submitLead] unexpected error', error);
    return toLeadResult({ kind: 'unexpected', contactEmail: await contactEmail() });
  }
}
