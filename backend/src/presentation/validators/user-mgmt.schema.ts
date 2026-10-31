import { z } from 'zod';
import { UserRole } from '../../domain/enums/UserRole.ts';
import { emailField, linkTokenField, newPasswordField, personNameField } from './common.schema.ts';

export const changeRoleSchema = z.object({
  role: z.enum(UserRole, 'Choose a role'),
});

// The invited person picks their own name when they accept
export const inviteUserSchema = z.object({
  email: emailField,
  role: z.enum(UserRole, 'Choose a role'),
});

export const acceptInviteSchema = z.object({
  token: linkTokenField,
  name: personNameField,
  password: newPasswordField(),
});
