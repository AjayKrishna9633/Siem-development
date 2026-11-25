import type { SmtpSecurity } from '../types/emailSettings.types.ts';

export const SECURITY_OPTIONS: readonly { value: SmtpSecurity; label: string; port: number }[] = [
  { value: 'starttls', label: 'STARTTLS (port 587)', port: 587 },
  { value: 'tls', label: 'TLS (port 465)', port: 465 },
  { value: 'none', label: 'None (not encrypted)', port: 25 },
];

export const DEFAULT_PORTS: ReadonlySet<number> = new Set(SECURITY_OPTIONS.map((o) => o.port));

export const GMAIL_APP_PASSWORD_URL = 'https://support.google.com/accounts/answer/185833';

export type PresetId = 'gmail' | 'microsoft365' | 'custom';

// Presets fill only the server fields; the account and sender stay as typed.
export const PRESETS: readonly {
  id: PresetId;
  label: string;
  server?: { host: string; port: number; security: SmtpSecurity };
}[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    server: { host: 'smtp.gmail.com', port: 587, security: 'starttls' },
  },
  {
    id: 'microsoft365',
    label: 'Microsoft 365',
    server: { host: 'smtp.office365.com', port: 587, security: 'starttls' },
  },
  { id: 'custom', label: 'Custom' },
];
