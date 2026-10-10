import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.js';
import type { IEmailService } from '../../application/interfaces/services/Email.service.interface.js';
import type { Transporter } from 'nodemailer';

@injectable()
export class EmailService implements IEmailService {

    constructor(
        @inject(TYPES.Transporter) private readonly transporter: Transporter,
        @inject(TYPES.SenderEmail) private readonly senderEmail: string
    ) {}

    async sendEmail(to: string, subject: string, text: string): Promise<void> {
        await this.transporter.sendMail({
            from: this.senderEmail,
            to,
            subject,
            text
        });
    }
}
