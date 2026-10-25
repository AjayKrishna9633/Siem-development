import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { IEmailService } from '../../application/interfaces/services/email.service.interface.ts';
import type { Transporter } from 'nodemailer';

@injectable()
export class EmailService implements IEmailService {
  constructor(
    @inject(TYPES.Transporter) private readonly transporter: Transporter,
    @inject(TYPES.SenderEmail) private readonly senderEmail: string,
  ) {}

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    await this.transporter.sendMail({
      from: `SIEMple <${this.senderEmail}>`,
      to,
      subject,
      text,
      ...(html && { html }),
    });
  }
}
