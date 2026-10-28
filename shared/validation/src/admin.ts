import { z } from 'zod';

import {
  APPLICATION_STATUSES,
  LEAD_STATUSES,
  STAFF_STATUSES,
  SUBSCRIBER_STATUSES,
} from './admin-options.js';
import { cursorQuerySchema, slugSchema, uuidV7Schema } from './common.js';
import { LEAD_KINDS } from './lead-options.js';
import { FIELD_LIMITS } from './limits.js';

/** Request schemas of the admin data screens (leads, subscribers, applicants, audit). */

const searchSchema = z.string().trim().min(1).max(100);
const dateTimeSchema = z.iso.datetime({ offset: true });

/** `?from=&to=` on list endpoints; `from` must not be after `to`. */
const dateRange = {
  from: dateTimeSchema.optional(),
  to: dateTimeSchema.optional(),
};

function checkRange(query: { from?: string | undefined; to?: string | undefined }) {
  return query.from === undefined || query.to === undefined || query.from <= query.to;
}
const rangeError = { message: '"from" must be before "to".', path: ['to'] };

export const leadsQuerySchema = cursorQuerySchema
  .extend({
    status: z.enum(LEAD_STATUSES).optional(),
    kind: z.enum(LEAD_KINDS).optional(),
    q: searchSchema.optional(),
    ...dateRange,
  })
  .refine(checkRange, rangeError);

/** `PATCH /admin/leads/:id`. `assigneeId: null` unassigns. */
export const updateLeadSchema = z
  .strictObject({
    status: z.enum(LEAD_STATUSES).optional(),
    assigneeId: uuidV7Schema.nullable().optional(),
  })
  .refine((body) => body.status !== undefined || body.assigneeId !== undefined, {
    message: 'Change the status or the assignee.',
  });

/** `POST /admin/leads/:id/notes`. */
export const leadNoteSchema = z.strictObject({
  body: z
    .string()
    .trim()
    .min(1, 'Write a note.')
    .max(FIELD_LIMITS.messageMax, `Notes are at most ${FIELD_LIMITS.messageMax} characters.`),
});

export const subscribersQuerySchema = cursorQuerySchema.extend({
  status: z.enum(SUBSCRIBER_STATUSES).optional(),
  q: searchSchema.optional(),
});

export const applicationsQuerySchema = cursorQuerySchema
  .extend({
    status: z.enum(APPLICATION_STATUSES).optional(),
    jobSlug: slugSchema.optional(),
    ...dateRange,
  })
  .refine(checkRange, rangeError);

/** `PATCH /admin/applications/:id`. */
export const updateApplicationSchema = z.strictObject({
  status: z.enum(APPLICATION_STATUSES),
});

export const auditQuerySchema = cursorQuerySchema
  .extend({
    actorId: uuidV7Schema.optional(),
    entity: z.string().trim().min(1).max(100).optional(),
    action: z.string().trim().min(1).max(100).optional(),
    ...dateRange,
  })
  .refine(checkRange, rangeError);

export const staffQuerySchema = cursorQuerySchema.extend({
  status: z.enum(STAFF_STATUSES).optional(),
  q: searchSchema.optional(),
});

/** `:id` path parameters are UUID v7. */
export const idParamSchema = z.strictObject({ id: uuidV7Schema });

export type LeadsQuery = z.infer<typeof leadsQuerySchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadNoteInput = z.infer<typeof leadNoteSchema>;
export type SubscribersQuery = z.infer<typeof subscribersQuerySchema>;
export type ApplicationsQuery = z.infer<typeof applicationsQuerySchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type StaffQuery = z.infer<typeof staffQuerySchema>;

/**
 * Body of `POST /admin/bot-defense/unban`: the address key exactly as the audit log
 * shows it for `security.ip_banned` (an IPv4 address, or an IPv6 /64 prefix).
 */
const IPV6_PREFIX_KEY = /^[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}::\/64$/;
const ipv4 = z.ipv4();

export const unbanAddressSchema = z.strictObject({
  ipKey: z
    .string()
    .trim()
    .refine(
      (key) => IPV6_PREFIX_KEY.test(key) || ipv4.safeParse(key).success,
      'Enter the address exactly as the audit log shows it.',
    ),
});
export type UnbanAddressInput = z.infer<typeof unbanAddressSchema>;
