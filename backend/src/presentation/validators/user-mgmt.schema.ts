import { z } from 'zod';
import { ACTIVATION_ID_PATTERN } from '../../application/interfaces/services/activation.service.interface.ts';
import { UserRole } from '../../domain/enums/UserRole.ts';
import { emailField, newPasswordField, secretField } from './common.schema.ts';

const personName = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);

export const addTeamMemberSchema = z.object({
  username: personName,
  email: emailField,
  role: z.enum(UserRole, 'Choose a role'),
});

export const activateAccountSchema = z.object({
  activationId: z.string().regex(ACTIVATION_ID_PATTERN, 'Activation link is invalid'),
  newPassword: newPasswordField(),
});

export const verifyActivationSchema = z.object({
  email: emailField,
  temporaryPassword: secretField('Temporary password'),
});
