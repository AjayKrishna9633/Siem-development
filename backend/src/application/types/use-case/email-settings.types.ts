import type { SmtpSecurity } from '../../../domain/enums/SmtpSecurity.ts';
import type { MailSource } from '../../interfaces/services/mail-transport.provider.interface.ts';

// SMTP_* from .env, when SMTP_HOST is set. These take precedence and are read-only in the UI.
export interface IEnvSmtpConfig {
  host: string;
  port: number;
  secure: boolean | undefined;
  user: string | undefined;
  password: string | undefined;
  from: string | undefined;
}

export interface IEmailLastTest {
  at: Date;
  ok: boolean;
  error: string | null;
}

// What the API returns. There is deliberately no password field, only whether one is stored.
export interface IEmailSettingsView {
  source: MailSource;
  host: string | null;
  port: number | null;
  security: SmtpSecurity;
  username: string | null;
  fromAddress: string | null;
  fromName: string | null;
  enabled: boolean;
  passwordSet: boolean;
  lastTest: IEmailLastTest | null;
  encryptionKeyConfigured: boolean;
}

export type EmailTestErrorCategory =
  | 'auth_failed'
  | 'connection_refused'
  | 'connection_timeout'
  | 'host_not_found'
  | 'tls_error'
  | 'sender_rejected'
  | 'recipient_rejected'
  | 'unknown';

export type IEmailTestResult =
  | { ok: true; to: string }
  | {
      ok: false;
      to: string;
      category: EmailTestErrorCategory;
      responseCode: number | null;
      message: string;
    };
