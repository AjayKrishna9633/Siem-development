import { z } from 'zod';
import { isEncryptionKey } from '../infrastructure/services/aes-gcm-secret-cipher.service.ts';
import { isHostAddress } from '../domain/policies/agent-identifier.policy.ts';

// The enrollment service's own settings. It deliberately knows nothing of the API's secrets
// (JWT_SECRET, REDIS_URL, SMTP, Wazuh API credentials, SETTINGS_ENCRYPTION_KEY): only what it needs
// to hand an agent its install script.
const enrollConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENROLL_PORT: z.coerce.number().int().min(1).max(65535).default(8443),
  // Connects as siemple_enroll, never as the database owner.
  ENROLL_DATABASE_URL: z.string().startsWith('postgres'),
  // Decrypts the pre-registered agent keys; the same value the API encrypts them with.
  ENROLL_KEY_SECRET: z
    .string()
    .refine(isEncryptionKey, 'must be 32 bytes of base64 (openssl rand -base64 32)'),
  // Not a secret: the address the installed agent connects to. Optional so the service still
  // starts on an install without it; the API makes no links until it is set.
  WAZUH_PUBLIC_ADDRESS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().refine(isHostAddress, 'must be an IPv4/IPv6 address or a hostname').optional(),
  ),
  // Not a secret: this service's own address, shown in the page's copyable commands. Default:
  // https://<WAZUH_PUBLIC_ADDRESS>:8443, the same default the API uses for the links.
  ENROLL_PUBLIC_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.url({ protocol: /^https$/, error: 'must be an https:// address' }).optional(),
  ),
  LOG_LEVEL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  ),
});

export type EnrollConfig = z.infer<typeof enrollConfigSchema>;

export type EnrollConfigResult =
  { ok: true; config: EnrollConfig } | { ok: false; errors: Record<string, string[] | undefined> };

export const parseEnrollConfig = (source: NodeJS.ProcessEnv): EnrollConfigResult => {
  const parsed = enrollConfigSchema.safeParse(source);
  return parsed.success
    ? { ok: true, config: parsed.data }
    : { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
};
