import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

const LINK_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isLinkToken = (token: string) => LINK_TOKEN_PATTERN.test(token);
export const isUuid = (id: string) => UUID_PATTERN.test(id);

const byteLength = (value: string) => new TextEncoder().encode(value).length;

const email = z
  .string()
  .trim()
  .min(1, 'Enter an email address.')
  .max(255, 'Email addresses can be at most 255 characters.')
  .pipe(z.email('Enter a full email address, like name@company.com.'));

const requiredPassword = (label = 'your password') => z.string().min(1, `Enter ${label}.`);

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .refine(
    (value) => byteLength(value) <= PASSWORD_MAX_BYTES,
    `Password is too long (at most ${PASSWORD_MAX_BYTES} bytes).`,
  );

const personName = z
  .string()
  .trim()
  .min(2, 'Enter a name of at least 2 characters.')
  .max(100, 'Names can be at most 100 characters.');

const linkToken = (message: string) =>
  z.string().trim().toLowerCase().regex(LINK_TOKEN_PATTERN, message);

const passwordsMatch = {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
};

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
    timezone: z.string().min(1, 'Choose a time zone.'),
  })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export const inviteUserSchema = z.object({
  email,
  role: z.enum(['admin', 't2_analyst', 't1_analyst']),
});

export const changeEmailSchema = (currentEmail: string) =>
  z.object({
    newEmail: email.refine(
      (value) => value.toLowerCase() !== currentEmail.toLowerCase(),
      'This is already your email address.',
    ),
    currentPassword: requiredPassword('your current password'),
  });

export const verificationCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: requiredPassword('your current password'),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'Choose a password different from your current one.',
    path: ['newPassword'],
  })
  .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch);

export const profileSchema = z.object({ username: personName });

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;
export type SetupTokenValues = z.infer<typeof setupTokenSchema>;
export type SetupDetailsValues = z.infer<typeof setupDetailsSchema>;
export type InviteUserValues = z.infer<typeof inviteUserSchema>;
export type ChangeEmailValues = z.infer<ReturnType<typeof changeEmailSchema>>;
export type VerificationCodeValues = z.infer<typeof verificationCodeSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
