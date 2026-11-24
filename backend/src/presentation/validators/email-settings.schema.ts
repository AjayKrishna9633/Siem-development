import { z } from 'zod';
import { SmtpSecurity } from '../../domain/enums/SmtpSecurity.ts';

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const blankToNull = (value: unknown) =>
  value === undefined || (typeof value === 'string' && value.trim() === '') ? null : value;

export const updateEmailSettingsSchema = z.object({
  host: z
    .string()
    .trim()
    .pipe(
      z.union([z.ipv4(), z.ipv6(), z.hostname()], {
        error: 'Enter a host name like smtp.example.com, or an IP address',
      }),
    ),
  port: z.coerce.number().int().min(1).max(65535),
  security: z.enum(SmtpSecurity, 'Choose none, starttls or tls'),
  username: z.preprocess(blankToNull, z.string().trim().max(320).nullable()),
  // Empty means "keep the current password".
  password: z.preprocess(blankToUndefined, z.string().max(256).optional()),
  fromAddress: z.email('Enter a valid From address').max(320),
  fromName: z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .max(120)
      .regex(/^[^\r\n<>"]*$/, 'The sender name cannot contain line breaks, quotes or < >')
      .nullable(),
  ),
});

export const testEmailSchema = z.object({
  to: z.preprocess(blankToUndefined, z.email('Enter a valid email address').optional()),
});
