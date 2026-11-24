export type EmailSource = 'env' | 'database' | 'none';

export type SmtpSecurity = 'none' | 'starttls' | 'tls';

export interface IEmailSettings {
  source: EmailSource;
  host: string | null;
  port: number | null;
  security: SmtpSecurity;
  username: string | null;
  fromAddress: string | null;
  fromName: string | null;
  enabled: boolean;
  passwordSet: boolean;
  lastTest: { at: string; ok: boolean; error: string | null } | null;
  encryptionKeyConfigured: boolean;
}

export interface IEmailSettingsInput {
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  // Empty keeps the stored password.
  password: string;
  fromAddress: string;
  fromName: string;
}

export type IEmailTestResult =
  | { ok: true; to: string }
  | { ok: false; to: string; category: string; responseCode: number | null; message: string };
