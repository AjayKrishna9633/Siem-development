import { z } from 'zod';
import { emailField, newPasswordField } from './common.schema.ts';
import { SUPER_ADMIN_PASSWORD_MIN_LENGTH } from '../../domain/policies/credentials.policy.ts';

export const registerSuperAdminSchema = z.object({
  email: emailField,
  username: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: newPasswordField(SUPER_ADMIN_PASSWORD_MIN_LENGTH),
});
