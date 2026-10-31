import { z } from 'zod';
import { emailField, newPasswordField, personNameField } from './common.schema.ts';

// 32 random bytes as hex, exactly as printed in the server log
const setupToken = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[0-9a-f]{64}$/, 'Enter the 64-character setup token printed in the server log');

// Intl accepts every IANA zone and throws on anything else. The zone is stored as
// entered: Intl's own "canonical" names are the legacy ones (Asia/Calcutta for
// Asia/Kolkata), which would surprise the admin who picked the modern name.
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
  // Emailed links are built as `${baseUrl}/accept-invite?...`, so no trailing slash
  baseUrl: z
    .url({ protocol: /^https?$/, error: 'Enter the full address, like https://siem.example.com' })
    .max(2048)
    .transform((url) => url.replace(/\/+$/, '')),
  timezone: z.string().trim().max(64).refine(isTimeZone, 'Choose a valid time zone'),
});
