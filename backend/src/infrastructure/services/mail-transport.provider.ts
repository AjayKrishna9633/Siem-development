import nodemailer, { type SMTPTransportOptions } from 'nodemailer';
import type {
  IMailSender,
  IMailTransport,
  IMailTransportProvider,
  MailSource,
} from '../../application/interfaces/services/mail-transport.provider.interface.ts';
import type { IEmailSettingsRepository } from '../../application/interfaces/repositories/email-settings.repository.interface.ts';
import type { ISecretCipher } from '../../application/interfaces/services/secret-cipher.service.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';
import type { IEmailSettings } from '../../domain/types/email-settings.types.ts';
import { SmtpSecurity } from '../../domain/enums/SmtpSecurity.ts';
import { SMTP_PASSWORD_AAD } from '../../domain/constants/email.ts';

export interface IEnvSmtpConfig {
  host: string;
  port: number;
  secure: boolean | undefined;
  user: string | undefined;
  password: string | undefined;
  from: string | undefined;
}

export type CreateMailSender = (options: SMTPTransportOptions) => IMailSender;

// A bad host must fail a request in seconds, not hang it.
const TIMEOUT_MS = 10_000;
const TIMEOUTS = {
  connectionTimeout: TIMEOUT_MS,
  greetingTimeout: TIMEOUT_MS,
  socketTimeout: TIMEOUT_MS,
};

export const createNodemailerSender: CreateMailSender = (options) =>
  nodemailer.createTransport(options);

// .env keeps today's behaviour: implicit TLS on 465, otherwise STARTTLS when the server offers it.
export const envTransportOptions = (env: IEnvSmtpConfig): SMTPTransportOptions => ({
  host: env.host,
  port: env.port,
  secure: env.secure ?? env.port === 465,
  ...(env.user && { auth: { user: env.user, pass: env.password ?? '' } }),
  ...TIMEOUTS,
});

const SECURITY_OPTIONS: Readonly<Record<SmtpSecurity, SMTPTransportOptions>> = {
  [SmtpSecurity.TLS]: { secure: true },
  [SmtpSecurity.STARTTLS]: { secure: false, requireTLS: true },
  [SmtpSecurity.NONE]: { secure: false, ignoreTLS: true },
};

export const databaseTransportOptions = (
  settings: IEmailSettings & { host: string; port: number },
  password: string | null,
): SMTPTransportOptions => ({
  host: settings.host,
  port: settings.port,
  ...SECURITY_OPTIONS[settings.security],
  ...(settings.username && { auth: { user: settings.username, pass: password ?? '' } }),
  ...TIMEOUTS,
});

const envFrom = (env: IEnvSmtpConfig): string => {
  const sender = env.from ?? env.user ?? 'siemple@localhost';
  return sender.includes('<') ? sender : `SIEMple <${sender}>`;
};

const isUsable = (
  settings: IEmailSettings,
): settings is IEmailSettings & { host: string; port: number; fromAddress: string } =>
  settings.enabled && !!settings.host && !!settings.port && !!settings.fromAddress;

export class MailTransportProvider implements IMailTransportProvider {
  private _cached: Promise<IMailTransport | null> | null = null;
  private _built: IMailTransport | null = null;
  private readonly _logger: ILogger;

  constructor(
    private readonly _env: IEnvSmtpConfig | null,
    private readonly _settings: IEmailSettingsRepository,
    private readonly _cipher: ISecretCipher,
    logger: ILogger,
    private readonly _create: CreateMailSender = createNodemailerSender,
  ) {
    this._logger = logger.child({ module: 'mail-transport' });
  }

  current(): Promise<IMailTransport | null> {
    if (!this._cached) {
      this._cached = this.build().then((transport) => {
        this._built = transport;
        return transport;
      });
      // A failed load (database down) is retried on the next call instead of cached.
      this._cached.catch(() => {
        this._cached = null;
      });
    }
    return this._cached;
  }

  async source(): Promise<MailSource> {
    return (await this.current())?.source ?? 'none';
  }

  invalidate(): void {
    this._built?.sender.close();
    this._built = null;
    this._cached = null;
  }

  private async build(): Promise<IMailTransport | null> {
    if (this._env) {
      return {
        source: 'env',
        sender: this._create(envTransportOptions(this._env)),
        from: envFrom(this._env),
      };
    }

    const settings = await this._settings.get();
    if (!isUsable(settings)) return null;

    let password: string | null = null;
    if (settings.password) {
      try {
        password = this._cipher.decrypt(settings.password, SMTP_PASSWORD_AAD);
      } catch (err) {
        this._logger.warn('Email is turned off: the stored SMTP password cannot be decrypted', {
          reason: err instanceof Error ? err.message : 'unknown',
        });
        return null;
      }
    }

    return {
      source: 'database',
      sender: this._create(databaseTransportOptions(settings, password)),
      from: settings.fromName
        ? { name: settings.fromName, address: settings.fromAddress }
        : settings.fromAddress,
    };
  }
}
