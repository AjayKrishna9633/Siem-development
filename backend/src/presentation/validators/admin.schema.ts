import { z } from 'zod';

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export const registerSuperAdminSchema = z.object({
  email: z.email().max(255),
  username: z.string().trim().min(2).max(100),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .refine((p) => byteLength(p) <= 72, 'Password too long (exceeds 72 bytes)'), // bcrypt ignores bytes after 72
});

export type RegisterSuperAdminInput = z.infer<typeof registerSuperAdminSchema>;