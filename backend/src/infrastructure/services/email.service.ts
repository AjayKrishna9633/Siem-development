import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type {
  IEmailDelivery,
  IEmailMessage,
  IEmailService,
} from '../../application/interfaces/services/email.service.interface.ts';
import type { IMailTransport } from '../../config/mailer.ts';

@injectable()
export class EmailService implements IEmailService {
  constructor(@inject(TYPES.MailTransport) private readonly transport: IMailTransport | null) {}

  get isConfigured(): boolean {
    return this.transport !== null;
  }

  async send(message: IEmailMessage): Promise<IEmailDelivery> {
    if (!this.transport) return { delivered: false };

    try {
      await this.transport.transporter.sendMail({
        from: this.transport.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html && { html: message.html }),
      });
      return { delivered: true };
    } catch (err) {
      console.error(`Email to ${message.to} failed:`, err);
      return { delivered: false };
    }
  }
}
