/** User roles, from most to least privileged (doc §2.1C, §9.7). */
export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

/** Roles that must enrol TOTP before reaching any admin route (doc §9.6). */
export const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: Role): role is StaffRole {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}
