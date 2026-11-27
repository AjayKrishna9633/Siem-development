import 'dotenv/config';
import { z } from 'zod';
import {
  isEnrollmentPassword,
  isHostAddress,
  normalizeVersion,
} from '../domain/policies/agent-identifier.policy.ts';
import { DEFAULT_WAZUH_AGENT_VERSION } from '../domain/constants/wazuh-packages.ts';
import { isEncryptionKey } from '../infrastructure/services/aes-gcm-secret-cipher.service.ts';
import { ENROLL_DB_PASSWORD_PATTERN } from '../infrastructure/database/enroll-role.ts';

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

  WAZUH_API_URL: z.string().url().default('https://wazuh-manager:55000'),
  WAZUH_API_USER: optionalText,
  WAZUH_API_PASSWORD: optionalText,
  WAZUH_API_CA_FILE: optionalText,
  WAZUH_API_TLS_INSECURE: z.preprocess((v) => v === 'true', z.boolean()),
  WAZUH_PUBLIC_ADDRESS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().refine(isHostAddress, 'must be an IPv4/IPv6 address or a hostname').optional(),
  ),
  WAZUH_ENROLLMENT_PASSWORD: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .refine(isEnrollmentPassword, '20-128 characters: letters, digits and - _ . : @ + = ! # ,')
      .optional(),
  ),
  WAZUH_AGENT_VERSION: z.preprocess(
    (v) => (v === '' || v === undefined ? DEFAULT_WAZUH_AGENT_VERSION : v),
    z.string().refine((v) => normalizeVersion(v) !== null, 'must look like 4.14.10'),
  ),

  // Optional: without it the email settings page can't store a password, but nothing crashes.
  SETTINGS_ENCRYPTION_KEY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .refine(isEncryptionKey, 'must be 32 bytes of base64 (openssl rand -base64 32)')
      .optional(),
  ),
  // Encrypts the Wazuh keys of pre-registered agents. Shared only with the enrollment service,
  // which decrypts a key when its script is downloaded. Without it, links can't be made.
  ENROLL_KEY_SECRET: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .refine(isEncryptionKey, 'must be 32 bytes of base64 (openssl rand -base64 32)')
      .optional(),
  ),
  // Where agents reach the enrollment service. Default: https://<WAZUH_PUBLIC_ADDRESS>:8443
  ENROLL_PUBLIC_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.url({ protocol: /^https$/, error: 'must be an https:// address' }).optional(),
  ),
  // Password of the siemple_enroll database role, applied after migrations. Without it the role
  // can't log in, so the enrollment service can't start. URL-safe, as it goes into a connection URL.
  ENROLL_DB_PASSWORD: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(ENROLL_DB_PASSWORD_PATTERN, '24-128 letters, digits, - or _ (openssl rand -hex 24)')
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
