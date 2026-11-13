import { z } from 'zod';
import {
  email,
  linkToken,
  newPassword,
  passwordsMatch,
  personName,
  requiredPassword,
} from '@/utils/validation.ts';

export const loginSchema = z.object({
  email,
  password: requiredPassword(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export const acceptInviteSchema = z
  .object({ name: personName, password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export const setupTokenSchema = z.object({
  token: linkToken('The setup token is 64 characters (0-9 and a-f). Copy it from the server log.'),
});

export const setupDetailsSchema = z
  .object({
    adminName: personName,
    email,
    password: newPassword,
    confirmPassword: z.string(),
    orgName: z
      .string()
      .trim()
      .min(2, 'Enter an organization name of at least 2 characters.')
      .max(150, 'Organization names can be at most 150 characters.'),
    baseUrl: z
      .string()
      .trim()
      .max(2048, 'The address can be at most 2048 characters.')
      .pipe(
        z.url({
          protocol: /^https?$/,
          error: 'Enter the full address SIEMple is reached at, like https://siem.example.com.',
        }),
      ),
  })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;
export type SetupTokenValues = z.infer<typeof setupTokenSchema>;
export type SetupDetailsValues = z.infer<typeof setupDetailsSchema>;
