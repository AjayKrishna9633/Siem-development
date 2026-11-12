import { z } from 'zod';
import { emailField, linkTokenField, newPasswordField, secretField } from './common.schema.ts';

const verificationCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const loginSchema = z.object({
  email: emailField,
  password: secretField('Password'),
});

export const requestPasswordResetSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: linkTokenField,
  password: newPasswordField(),
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(100, 'Username must not exceed 100 characters'),
});

export const changePasswordSchema = z.object({
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
