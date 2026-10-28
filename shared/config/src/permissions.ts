import { type Role } from '@agency/types';

/**
 * Admin permissions (ADR 0014). Every `/api/v1/admin/*` route requires exactly
 * one of these, and the admin UI uses the same map to hide what a role cannot
 * do. The API check is the real lock; hiding a button is only a convenience.
 */
export const PERMISSIONS = [
  'dashboard.view',
  'team.manage',
  'security.manage',
  'settings.manage',
  'content.edit',
  'content.publish',
  'content.delete',
  'media.upload',
  'media.delete',
  'leads.view',
  'leads.update',
  'leads.notes',
  'newsletter.view',
  'newsletter.export',
  'newsletter.erase',
  'applications.view',
  'applications.update',
  'applications.download',
  'audit.view',
  /** Redirects, 404 monitoring and the broken-link report. */
  'seo.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Super Admin only: team accounts, roles and security settings. */
const SUPER_ADMIN_ONLY: ReadonlySet<Permission> = new Set(['team.manage', 'security.manage']);

const STAFF_PERMISSIONS: readonly Permission[] = [
  'dashboard.view',
  'content.edit',
  'media.upload',
  'leads.view',
  'leads.notes',
];

/**
 * The permission matrix from ADR 0014. Super Admin has everything, so it can
 * never be locked out; Admin has everything except team and security; Staff
 * can draft content, upload media and read leads. Clients have no admin access.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: PERMISSIONS.filter((permission) => !SUPER_ADMIN_ONLY.has(permission)),
  STAFF: STAFF_PERMISSIONS,
  CLIENT: [],
};

/** True when `role` grants `permission`. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Type guard for values read from untrusted input (tokens, query strings). */
export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
