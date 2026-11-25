import type { SmtpSecurity } from '../enums/SmtpSecurity.ts';

export interface IEncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export interface IEmailSettings {
  host: string | null;
  port: number | null;
  security: SmtpSecurity;
  username: string | null;
  password: IEncryptedSecret | null;
  fromAddress: string | null;
  fromName: string | null;
  enabled: boolean;
  lastTestAt: Date | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}
