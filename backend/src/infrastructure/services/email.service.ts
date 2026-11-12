import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type {
  IEmailDelivery,
  IEmailMessage,
  IEmailService,
} from '../../application/interfaces/services/email.service.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';
import type { IMailTransport } from '../../config/mailer.ts';

@injectable()
export class EmailService implements IEmailService {
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.MailTransport) private readonly _transport: IMailTransport | null,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'email' });
  }

  get isConfigured(): boolean {
    return this._transport !== null;
  }

  async send(message: IEmailMessage): Promise<IEmailDelivery> {
    if (!this._transport) return { delivered: false };

    try {
      await this._transport.transporter.sendMail({
        from: this._transport.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html && { html: message.html }),
      });
      return { delivered: true };
    } catch (err) {
      this._logger.error('Email could not be sent', {
        to: message.to,
        subject: message.subject,
        err,
      });
      return { delivered: false };
    }
  }
}
