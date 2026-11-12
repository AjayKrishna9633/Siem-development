import { z } from 'zod';
import { UserRole } from '../../domain/enums/UserRole.ts';
import { UserStatus } from '../../domain/enums/UserStatus.ts';
import { emailField, linkTokenField, newPasswordField, personNameField } from './common.schema.ts';

export const changeRoleSchema = z.object({
  role: z.enum(UserRole, 'Choose a role'),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus).optional(),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'lastLogin']).default('name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const inviteUserSchema = z.object({
  email: emailField,
  role: z.enum(UserRole, 'Choose a role'),
});

export const acceptInviteSchema = z.object({
  token: linkTokenField,
  name: personNameField,
  password: newPasswordField(),
});
