import { z } from 'zod';
import { emailField, newPasswordField, personNameField } from './common.schema.ts';

const setupToken = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[0-9a-f]{64}$/, 'Enter the 64-character setup token printed in the server log');

const isTimeZone = (zone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

export const verifySetupTokenSchema = z.object({
  token: setupToken,
});

export const completeSetupSchema = z.object({
  token: setupToken,
  adminName: personNameField,
  email: emailField,
  password: newPasswordField(),
  orgName: z.string().trim().min(2, 'Organization name must be at least 2 characters').max(150),
  baseUrl: z
    .url({ protocol: /^https?$/, error: 'Enter the full address, like https://siem.example.com' })
    .max(2048)
    .transform((url) => url.replace(/\/+$/, '')),
  timezone: z.string().trim().max(64).refine(isTimeZone, 'Choose a valid time zone'),
});
