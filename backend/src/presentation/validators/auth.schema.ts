import { z } from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().email().max(255),
  type: z.enum(['signup', 'reset']),
});

export type SendOtpInputDTO = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email().max(255),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain numbers only'),
  type: z.enum(['signup', 'reset']),
});

export type VerifyOtpInputDTO = z.infer<typeof verifyOtpSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginInputDTO = z.infer<typeof loginSchema>;

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export const resetPasswordSchema = z.object({
  email: z.string().email().max(255),
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((p) => byteLength(p) <= 72, 'Password too long (exceeds 72 bytes)'),
});

export type ResetPasswordInputDTO = z.infer<typeof resetPasswordSchema>;
