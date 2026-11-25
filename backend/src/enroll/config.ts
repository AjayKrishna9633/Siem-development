import { z } from 'zod';

// The enrollment service's own settings. It deliberately knows nothing of the API's secrets
// (JWT_SECRET, REDIS_URL, SMTP, Wazuh, SETTINGS_ENCRYPTION_KEY): it gets only what it needs.
const enrollConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENROLL_PORT: z.coerce.number().int().min(1).max(65535).default(8443),
  // Connects as siemple_enroll, never as the database owner.
  ENROLL_DATABASE_URL: z.string().startsWith('postgres'),
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
