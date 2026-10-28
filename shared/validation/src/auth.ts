import { STAFF_ROLES } from '@agency/types';
import { z } from 'zod';

import { PASSWORD_LIMITS, STAFF_STATUSES } from './admin-options.js';
import { emailSchema, nameSchema, opaqueTokenSchema } from './common.js';

/**
 * A new password (doc §9.6): 12 to 128 characters, any characters. Not trimmed:
 * spaces are part of a passphrase. The API also rejects breached passwords (HIBP).
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_LIMITS.min, `Use at least ${PASSWORD_LIMITS.min} characters.`)
  .max(PASSWORD_LIMITS.max, `Use at most ${PASSWORD_LIMITS.max} characters.`);

/**
 * A password typed at login. Only the length is capped (argon2 cost), so a user
 * with an older, shorter password still gets the generic "invalid credentials".
 */
const currentPasswordSchema = z
  .string()
  .min(1, 'Enter your password.')
  .max(PASSWORD_LIMITS.max, 'Email or password is incorrect.');

/** Six-digit TOTP code from an authenticator app. */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.');

/** Single-use recovery code: two groups of five base32 characters, e.g. `k3j7q-x2m4p`. */
export const recoveryCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z2-7]{5}-[a-z2-7]{5}$/, 'Enter a recovery code like abcde-fghij.');

/** `POST /auth/login`. */
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: currentPasswordSchema,
});

/**
 * `POST /auth/mfa/verify`: the challenge from the login step plus either a TOTP
 * code or one recovery code.
 */
export const mfaVerifySchema = z.union([
  z.strictObject({ challengeToken: opaqueTokenSchema, totpCode: totpCodeSchema }),
  z.strictObject({ challengeToken: opaqueTokenSchema, recoveryCode: recoveryCodeSchema }),
]);

/** `POST /auth/mfa/enroll/start`: the challenge from a login that still needs 2FA set up. */
export const mfaEnrollStartSchema = z.strictObject({ challengeToken: opaqueTokenSchema });

/** `POST /auth/mfa/enroll/confirm`: proves the authenticator app was set up. */
export const mfaEnrollConfirmSchema = z.strictObject({
  challengeToken: opaqueTokenSchema,
  totpCode: totpCodeSchema,
});

/** `POST /auth/refresh` and `POST /auth/logout`: the opaque rotating refresh token. */
export const refreshTokenSchema = z.strictObject({ refreshToken: opaqueTokenSchema });

/** `POST /auth/step-up`: re-authentication before a sensitive action (doc §9.6). */
export const stepUpSchema = z.strictObject({
  password: currentPasswordSchema,
  totpCode: totpCodeSchema,
});

/** `POST /auth/password/forgot`. Always answered with 202, so emails cannot be probed. */
export const forgotPasswordSchema = z.strictObject({ email: emailSchema });

/** `POST /auth/password/reset`. */
export const resetPasswordSchema = z.strictObject({
  token: opaqueTokenSchema,
  password: passwordSchema,
});

/** `POST /auth/invitations/accept`: a staff invitation creates the account. */
export const acceptInvitationSchema = z.strictObject({
  token: opaqueTokenSchema,
  name: nameSchema,
  password: passwordSchema,
});

/** `PATCH /admin/me`. */
export const updateProfileSchema = z.strictObject({ name: nameSchema });

/** `POST /admin/me/password` (requires step-up). */
export const changePasswordSchema = z
  .strictObject({
    currentPassword: currentPasswordSchema,
    newPassword: passwordSchema,
  })
  .refine((body) => body.currentPassword !== body.newPassword, {
    message: 'Choose a password you have not used here before.',
    path: ['newPassword'],
  });

/** `POST /admin/invitations` (Super Admin). */
export const inviteStaffSchema = z.strictObject({
  email: emailSchema,
  role: z.enum(STAFF_ROLES),
});

/** `PATCH /admin/users/:id` (Super Admin, requires step-up). */
export const updateStaffSchema = z
  .strictObject({
    role: z.enum(STAFF_ROLES).optional(),
    status: z.enum(STAFF_STATUSES).optional(),
  })
  .refine((body) => body.role !== undefined || body.status !== undefined, {
    message: 'Change the role or the status.',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaEnrollStartInput = z.infer<typeof mfaEnrollStartSchema>;
export type MfaEnrollConfirmInput = z.infer<typeof mfaEnrollConfirmSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type StepUpInput = z.infer<typeof stepUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
