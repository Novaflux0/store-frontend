import { describe, expect, it } from 'vitest';

import {
  acceptInvitationSchema,
  changePasswordSchema,
  inviteStaffSchema,
  loginSchema,
  mfaVerifySchema,
  passwordSchema,
  recoveryCodeSchema,
  totpCodeSchema,
  updateStaffSchema,
} from './auth.js';

const TOKEN = 'a'.repeat(43);

describe('passwordSchema', () => {
  it('accepts 12 to 128 characters and keeps spaces', () => {
    expect(passwordSchema.parse(' correct horse ')).toBe(' correct horse ');
    expect(passwordSchema.safeParse('a'.repeat(128)).success).toBe(true);
  });

  it('rejects short and overlong passwords', () => {
    expect(passwordSchema.safeParse('a'.repeat(11)).success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('normalises the email and accepts any non-empty password', () => {
    expect(loginSchema.parse({ email: ' Ada@Example.com ', password: 'short' })).toEqual({
      email: 'ada@example.com',
      password: 'short',
    });
  });

  it('rejects unknown fields and empty passwords', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: 'x', role: 'SUPER_ADMIN' }).success,
    ).toBe(false);
  });
});

describe('second factor', () => {
  it('accepts six-digit TOTP codes only', () => {
    expect(totpCodeSchema.parse(' 123456 ')).toBe('123456');
    expect(totpCodeSchema.safeParse('12345').success).toBe(false);
    expect(totpCodeSchema.safeParse('12345a').success).toBe(false);
  });

  it('normalises recovery codes', () => {
    expect(recoveryCodeSchema.parse(' ABCDE-FGH23 ')).toBe('abcde-fgh23');
    expect(recoveryCodeSchema.safeParse('abcde-fgh1j').success).toBe(false);
  });

  it('verifies with either a TOTP code or a recovery code, not neither', () => {
    expect(mfaVerifySchema.safeParse({ challengeToken: TOKEN, totpCode: '123456' }).success).toBe(
      true,
    );
    expect(
      mfaVerifySchema.safeParse({ challengeToken: TOKEN, recoveryCode: 'abcde-fghij' }).success,
    ).toBe(true);
    expect(mfaVerifySchema.safeParse({ challengeToken: TOKEN }).success).toBe(false);
  });
});

describe('account and team', () => {
  it('requires a strong password when accepting an invitation', () => {
    expect(
      acceptInvitationSchema.safeParse({ token: TOKEN, name: 'Ada', password: 'short' }).success,
    ).toBe(false);
    expect(
      acceptInvitationSchema.safeParse({ token: TOKEN, name: 'Ada', password: 'long enough pass' })
        .success,
    ).toBe(true);
  });

  it('refuses a new password equal to the current one', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'same password!',
      newPassword: 'same password!',
    });
    expect(result.success).toBe(false);
  });

  it('only invites staff roles', () => {
    expect(inviteStaffSchema.safeParse({ email: 'a@b.co', role: 'STAFF' }).success).toBe(true);
    expect(inviteStaffSchema.safeParse({ email: 'a@b.co', role: 'CLIENT' }).success).toBe(false);
  });

  it('needs a role or a status change', () => {
    expect(updateStaffSchema.safeParse({}).success).toBe(false);
    expect(updateStaffSchema.safeParse({ status: 'disabled' }).success).toBe(true);
    expect(updateStaffSchema.safeParse({ role: 'ADMIN' }).success).toBe(true);
  });
});
