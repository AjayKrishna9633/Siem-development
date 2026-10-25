import { z } from 'zod';
import { ACTIVATION_ID_PATTERN } from '../../application/interfaces/services/activation.service.interface.ts';
import { emailField, newPasswordField, secretField } from './common.schema.ts';

const companyName = z.string().trim().min(2, 'Company name must be at least 2 characters').max(150);
const personName = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);

export const createCompanySchema = z.object({
  name: companyName,
  adminName: personName,
  adminEmail: emailField,
});

export const updateCompanySchema = z.object({
  name: companyName,
});

export const replaceCompanyAdminSchema = z.object({
  adminName: personName,
  adminEmail: emailField,
});

export const addTeamMemberSchema = z.object({
  username: personName,
  email: emailField,
});

// Only company members activate, so the standard minimum applies
export const activateAccountSchema = z.object({
  activationId: z.string().regex(ACTIVATION_ID_PATTERN, 'Activation link is invalid'),
  newPassword: newPasswordField(),
});

export const verifyActivationSchema = z.object({
  email: emailField,
  temporaryPassword: secretField('Temporary password'),
});
