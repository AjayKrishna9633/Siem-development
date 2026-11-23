import type { IMailTransport } from './mail-transport.provider.interface.ts';
import type { IEmailTestResult } from '../../types/use-case/email-settings.types.ts';

// Verifies the connection and sends one test email. Failures come back as a safe category and
// SMTP code, never the server's raw reply.
export interface IEmailTester {
  send(transport: IMailTransport, to: string): Promise<IEmailTestResult>;
}
