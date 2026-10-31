import { z } from 'zod';
import { ACTIVATION_ID_PATTERN } from '../../application/interfaces/services/activation.service.interface.ts';
import { UserRole } from '../../domain/enums/UserRole.ts';
import { emailField, newPasswordField, personNameField, secretField } from './common.schema.ts';

export const changeRoleSchema = z.object({
  role: z.enum(UserRole, 'Choose a role'),
});

export const addUserSchema = z.object({
  username: personNameField,
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
