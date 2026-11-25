import type { IEmailSettings } from '../../../domain/types/email-settings.types.ts';
import { SmtpSecurity } from '../../../domain/enums/SmtpSecurity.ts';
import type {
  IEmailSettingsView,
  IEnvSmtpConfig,
} from '../../types/use-case/email-settings.types.ts';

const SETTING_FIELDS = [
  'host',
  'port',
  'security',
  'username',
  'fromAddress',
  'fromName',
  'enabled',
] as const;

const CONNECTION_FIELDS = new Set<string>(['host', 'port', 'security', 'username', 'password']);

const envSecurity = (env: IEnvSmtpConfig): SmtpSecurity =>
  (env.secure ?? env.port === 465) ? SmtpSecurity.TLS : SmtpSecurity.STARTTLS;

export const toEmailSettingsView = (
  settings: IEmailSettings,
  env: IEnvSmtpConfig | null,
  encryptionKeyConfigured: boolean,
): IEmailSettingsView => {
  const lastTest =
    settings.lastTestAt && settings.lastTestOk !== null
      ? { at: settings.lastTestAt, ok: settings.lastTestOk, error: settings.lastTestError }
      : null;

  if (env) {
    return {
      source: 'env',
      host: env.host,
      port: env.port,
      security: envSecurity(env),
      username: env.user ?? null,
      fromAddress: env.from ?? env.user ?? null,
      fromName: null,
      enabled: true,
      passwordSet: !!env.password,
      lastTest,
      encryptionKeyConfigured,
    };
  }

  return {
    source: settings.enabled ? 'database' : 'none',
    host: settings.host,
    port: settings.port,
    security: settings.security,
    username: settings.username,
    fromAddress: settings.fromAddress,
    fromName: settings.fromName,
    enabled: settings.enabled,
    passwordSet: settings.password !== null,
    lastTest,
    encryptionKeyConfigured,
  };
};

// Field names only: the audit log records what changed, never the values.
export const changedEmailFields = (
  before: IEmailSettings,
  after: IEmailSettings,
  passwordChanged: boolean,
): string[] => {
  const changed: string[] = SETTING_FIELDS.filter((field) => before[field] !== after[field]);
  if (passwordChanged) changed.push('password');
  return changed;
};

export const touchesConnection = (changedFields: readonly string[]): boolean =>
  changedFields.some((field) => CONNECTION_FIELDS.has(field));
