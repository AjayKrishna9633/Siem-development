import 'dotenv/config';
import { z } from 'zod';
import { isEncryptionKey } from '../infrastructure/services/aes-gcm-secret-cipher.service.ts';

const optionalText = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().startsWith('postgres'),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  APP_URL: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  ),
  TRUST_PROXY: z.preprocess(
    (v) => {
      if (v === undefined || v === '' || v === 'false') return undefined;
      if (v === 'true') return true;
      return typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
    },
    z.union([z.boolean(), z.number().int().nonnegative(), z.string()]).optional(),
  ),

  SMTP_HOST: optionalText,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v === 'true'),
    z.boolean().optional(),
  ),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: optionalText,
  OTP_EMAIL: optionalText,
  OTP_PASSWORD: optionalText,

  // Optional: without it the email settings page can't store a password, but nothing crashes.
  SETTINGS_ENCRYPTION_KEY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .refine(isEncryptionKey, 'must be 32 bytes of base64 (openssl rand -base64 32)')
      .optional(),
  ),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const envConfig = parsed.data;
export const env = envConfig;

export const resolveAppOrigin = (appUrl: string | undefined, frontendUrl: string): string =>
  new URL(appUrl ?? frontendUrl).origin;

export const appOrigin = resolveAppOrigin(env.APP_URL, env.FRONTEND_URL);

export const secureCookies = appOrigin.startsWith('https://');
