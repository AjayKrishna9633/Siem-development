import { z } from 'zod';

const byteLength = (s: string) => new TextEncoder().encode(s).length;

const companyName = z.string().trim().min(2, 'Company name must be at least 2 characters').max(150);
const personName = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);
const email = z.string().email().max(255);

export const createCompanySchema = z.object({
  name: companyName,
  adminName: personName,
  adminEmail: email,
});

export const updateCompanySchema = z.object({
  name: companyName,
});

export const replaceCompanyAdminSchema = z.object({
  adminName: personName,
  adminEmail: email,
});

export const addTeamMemberSchema = z.object({
  username: personName,
  email,
});

export const activateAccountSchema = z.object({
  activationId: z.string().min(1, 'Activation link is required'),
  email,
  temporaryPassword: z.string().min(1, 'Temporary password is required').max(128),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((p) => byteLength(p) <= 72, 'Password too long (exceeds 72 bytes)'),
});

export type CreateCompanyInputDTO = z.infer<typeof createCompanySchema>;
export type ActivateAccountInputDTO = z.infer<typeof activateAccountSchema>;
