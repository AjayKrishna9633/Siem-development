import type { IEmailSettingsView } from '../../../types/use-case/email-settings.types.ts';
import { iso } from '../../dates.ts';

export interface IEmailSettingsDto extends Omit<IEmailSettingsView, 'lastTest'> {
  lastTest: { at: string; ok: boolean; error: string | null } | null;
}

export const toEmailSettingsDto = (view: IEmailSettingsView): IEmailSettingsDto => ({
  source: view.source,
  host: view.host,
  port: view.port,
  security: view.security,
  username: view.username,
  fromAddress: view.fromAddress,
  fromName: view.fromName,
  enabled: view.enabled,
  passwordSet: view.passwordSet,
  lastTest: view.lastTest
    ? { at: iso(view.lastTest.at), ok: view.lastTest.ok, error: view.lastTest.error }
    : null,
  encryptionKeyConfigured: view.encryptionKeyConfigured,
});
