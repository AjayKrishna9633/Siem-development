import { z } from 'zod';
import { emailField, newPasswordField, secretField } from './common.schema.ts';

const verificationCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const sendOtpSchema = z.object({
  email: emailField,
  type: z.literal('reset'),
});

export const verifyOtpSchema = z.object({
  email: emailField,
  otp: verificationCode,
  type: z.literal('reset'),
});

export const loginSchema = z.object({
  email: emailField,
  password: secretField('Password'),
});

// A super admin's longer minimum is enforced in the use case, which knows the role
export const resetPasswordSchema = z.object({
  email: emailField,
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: newPasswordField(),
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(100, 'Username must not exceed 100 characters'),
});

export const changePasswordSchema = z.object({
  code: verificationCode,
  currentPassword: secretField('Current password'),
  newPassword: newPasswordField(),
});

export const requestEmailChangeSchema = z.object({
  newEmail: emailField,
  currentPassword: secretField('Current password'),
});

export const changeEmailSchema = z.object({
  code: verificationCode,
});
