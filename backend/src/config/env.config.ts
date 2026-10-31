import 'dotenv/config';
import { z } from 'zod';

// An empty line in .env (`SMTP_HOST=`) means "not set", not "set to empty"
const optionalText = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().startsWith('postgres'),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Email is optional: without it, invite and reset links are shown to the admin to
  // pass on by hand. SMTP_SECURE defaults to true on port 465 (implicit TLS).
  SMTP_HOST: optionalText,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v === 'true'),
    z.boolean().optional(),
  ),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  // e.g. "SIEMple <siem@acme.com>"; defaults to SMTP_USER
  SMTP_FROM: optionalText,
  // Gmail settings from before SMTP_* existed; only used when SMTP_HOST is not set
  OTP_EMAIL: optionalText,
  OTP_PASSWORD: optionalText,
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const envConfig = parsed.data;
export const env = envConfig;
