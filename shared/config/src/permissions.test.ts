import { ROLES } from '@agency/types';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS, ROLE_PERMISSIONS, can, isPermission } from './index.js';

describe('permission matrix (ADR 0014)', () => {
  it('gives Super Admin every permission, so it can never be locked out', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toEqual(PERMISSIONS);
  });

  it('keeps team and security management for Super Admin only', () => {
    for (const role of ROLES) {
      if (role === 'SUPER_ADMIN') continue;
      expect(can(role, 'team.manage')).toBe(false);
      expect(can(role, 'security.manage')).toBe(false);
    }
  });

  it('gives Admin everything else', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual(
      PERMISSIONS.filter((p) => p !== 'team.manage' && p !== 'security.manage'),
    );
  });

  it('limits Staff to drafting content, uploading media and reading leads', () => {
    expect([...ROLE_PERMISSIONS.STAFF].sort()).toEqual(
      ['content.edit', 'dashboard.view', 'leads.notes', 'leads.view', 'media.upload'].sort(),
    );
    expect(can('STAFF', 'content.publish')).toBe(false);
    expect(can('STAFF', 'content.delete')).toBe(false);
    expect(can('STAFF', 'newsletter.view')).toBe(false);
    expect(can('STAFF', 'applications.view')).toBe(false);
    // Write actions have their own permissions, never implied by read access.
    expect(can('STAFF', 'applications.update')).toBe(false);
    expect(can('STAFF', 'newsletter.erase')).toBe(false);
    expect(can('ADMIN', 'applications.update')).toBe(true);
    expect(can('ADMIN', 'newsletter.erase')).toBe(true);
    expect(can('STAFF', 'audit.view')).toBe(false);
  });

  it('gives clients no admin access', () => {
    expect(ROLE_PERMISSIONS.CLIENT).toEqual([]);
    for (const permission of PERMISSIONS) expect(can('CLIENT', permission)).toBe(false);
  });

  it('recognises only known permission strings', () => {
    expect(isPermission('content.publish')).toBe(true);
    expect(isPermission('content.*')).toBe(false);
    expect(isPermission('')).toBe(false);
  });
});
