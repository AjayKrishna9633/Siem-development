import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type {
  IEmailDelivery,
  IEmailMessage,
  IEmailService,
} from '../../application/interfaces/services/email.service.interface.ts';
import type { IMailTransportProvider } from '../../application/interfaces/services/mail-transport.provider.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

@injectable()
export class EmailService implements IEmailService {
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.MailTransportProvider) private readonly _transports: IMailTransportProvider,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'email' });
  }

  async isConfigured(): Promise<boolean> {
    return (await this._transports.current()) !== null;
  }

  async send(message: IEmailMessage): Promise<IEmailDelivery> {
    try {
      const transport = await this._transports.current();
      if (!transport) return { delivered: false };
      await transport.sender.sendMail({
        from: transport.from,
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
