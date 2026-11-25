import type {
  IEmailSettings,
  IEncryptedSecret,
} from '../../../domain/types/email-settings.types.ts';
import { SmtpSecurity } from '../../../domain/enums/SmtpSecurity.ts';
import { EMAIL_SETTINGS_ROW_ID, type EmailSettingsModel } from '../models/email-settings.model.ts';

const SECURITY_MODES = new Set<string>(Object.values(SmtpSecurity));

const passwordFrom = (row: EmailSettingsModel): IEncryptedSecret | null =>
  row.passwordCiphertext && row.passwordIv && row.passwordAuthTag && row.keyVersion !== null
    ? {
        ciphertext: row.passwordCiphertext,
        iv: row.passwordIv,
        authTag: row.passwordAuthTag,
        keyVersion: row.keyVersion,
      }
    : null;

export const toEmailSettings = (row: EmailSettingsModel): IEmailSettings => ({
  host: row.host,
  port: row.port,
  security: SECURITY_MODES.has(row.security)
    ? (row.security as SmtpSecurity)
    : SmtpSecurity.STARTTLS,
  username: row.username,
  password: passwordFrom(row),
  fromAddress: row.fromAddress,
  fromName: row.fromName,
  enabled: row.enabled,
  lastTestAt: row.lastTestAt,
  lastTestOk: row.lastTestOk,
  lastTestError: row.lastTestError,
  updatedBy: row.updatedBy,
  updatedAt: row.updatedAt,
});

export const toEmailSettingsRow = (
  settings: IEmailSettings,
): Omit<EmailSettingsModel, 'createdAt' | 'updatedAt' | 'updater'> => ({
  id: EMAIL_SETTINGS_ROW_ID,
  host: settings.host,
  port: settings.port,
  security: settings.security,
  username: settings.username,
  passwordCiphertext: settings.password?.ciphertext ?? null,
  passwordIv: settings.password?.iv ?? null,
  passwordAuthTag: settings.password?.authTag ?? null,
  keyVersion: settings.password?.keyVersion ?? null,
  fromAddress: settings.fromAddress,
  fromName: settings.fromName,
  enabled: settings.enabled,
  lastTestAt: settings.lastTestAt,
  lastTestOk: settings.lastTestOk,
  lastTestError: settings.lastTestError,
  updatedBy: settings.updatedBy,
});
