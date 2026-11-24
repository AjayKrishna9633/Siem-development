import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { IEmailTester } from '../../application/interfaces/services/email-tester.interface.ts';
import type { IMailTransport } from '../../application/interfaces/services/mail-transport.provider.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';
import type {
  EmailTestErrorCategory,
  IEmailTestResult,
} from '../../application/types/use-case/email-settings.types.ts';

const MESSAGES: Readonly<Record<EmailTestErrorCategory, string>> = {
  auth_failed:
    'The mail server rejected the username or password. For Gmail, use an App Password, not your normal password.',
  connection_refused:
    'The mail server refused the connection. Check the host and port, and that the server accepts mail on that port.',
  connection_timeout:
    "The mail server didn't answer in time. The port is probably blocked by a firewall, or the host is wrong.",
  host_not_found: "The mail server's host name could not be found. Check the spelling.",
  tls_error:
    'The encrypted connection failed. Check the security setting: TLS uses port 465, STARTTLS uses 587.',
  sender_rejected:
    'The mail server refused the From address. Use an address that this account is allowed to send from.',
  recipient_rejected: 'The mail server refused the recipient address.',
  unknown: 'The test email could not be sent. Check the settings and try again.',
};

const SUBJECT = 'SIEMple test email';
const BODY =
  'This is a test email from SIEMple. If you can read it, invitations and password-reset emails will be delivered.';

interface ISmtpError {
  code?: unknown;
  responseCode?: unknown;
  command?: unknown;
  message?: unknown;
}

const asSmtpError = (err: unknown): ISmtpError =>
  typeof err === 'object' && err !== null ? (err as ISmtpError) : {};

// Classifies by nodemailer's code, the numeric SMTP reply and the command that failed. The message
// is only inspected for TLS failures, and is never returned or logged.
export const classifySmtpError = (
  err: unknown,
): { category: EmailTestErrorCategory; responseCode: number | null } => {
  const e = asSmtpError(err);
  const code = typeof e.code === 'string' ? e.code : '';
  const responseCode = typeof e.responseCode === 'number' ? e.responseCode : null;
  const command = typeof e.command === 'string' ? e.command.toUpperCase() : '';
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';

  const category = ((): EmailTestErrorCategory => {
    if (code === 'EAUTH' || responseCode === 535 || responseCode === 534) return 'auth_failed';
    if (code === 'ETLS' || /tls|ssl|wrong version number|certificate/.test(message)) {
      return 'tls_error';
    }
    if (code === 'EDNS' || /enotfound|eai_again/.test(message)) return 'host_not_found';
    if (code === 'ETIMEDOUT' || /timeout|timed out/.test(message)) return 'connection_timeout';
    if (code === 'ECONNECTION' || code === 'ESOCKET' || /econnrefused/.test(message)) {
      return 'connection_refused';
    }
    if (code === 'EENVELOPE' || command.startsWith('MAIL FROM') || command.startsWith('RCPT TO')) {
      return command.startsWith('RCPT TO') ? 'recipient_rejected' : 'sender_rejected';
    }
    return 'unknown';
  })();

  return { category, responseCode };
};

@injectable()
export class SmtpEmailTester implements IEmailTester {
  private readonly _logger: ILogger;

  constructor(@inject(TYPES.Logger) logger: ILogger) {
    this._logger = logger.child({ module: 'email-test' });
  }

  async send(transport: IMailTransport, to: string): Promise<IEmailTestResult> {
    try {
      await transport.sender.verify();
      await transport.sender.sendMail({ from: transport.from, to, subject: SUBJECT, text: BODY });
      return { ok: true, to };
    } catch (err) {
      const { category, responseCode } = classifySmtpError(err);
      this._logger.warn('Test email failed', { source: transport.source, category, responseCode });
      return { ok: false, to, category, responseCode, message: MESSAGES[category] };
    }
  }
}
