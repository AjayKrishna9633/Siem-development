import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { IEmailService } from '../../application/interfaces/services/email.service.interface.ts';
import type { ISecurityMailer } from '../../application/interfaces/services/security-mailer.interface.ts';
import type { VerificationPurpose } from '../../application/interfaces/services/verification-code.service.interface.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';
import {
  securityEmailHtml,
  securityEmailText,
  type ISecurityEmailInput,
} from './templates/security-email.ts';

const NOT_YOU =
  "Didn't request this? Ignore this email and your account stays as it is. If it keeps happening, change your password.";

const codeCopy: Record<VerificationPurpose, { subject: string; eyebrow: string; action: string }> =
  {
    'email-change': {
      subject: 'Confirm your new SIEMple email address',
      eyebrow: 'Email change',
      action: 'make this your new sign-in email',
    },
  };

@injectable()
export class SecurityMailer implements ISecurityMailer {
  constructor(@inject(TYPES.EmailService) private readonly _email: IEmailService) {}

  private send(to: string, subject: string, content: ISecurityEmailInput) {
    return this._email.send({
      to,
      subject,
      text: securityEmailText(content),
      html: securityEmailHtml(content),
    });
  }

  private async sendNotice(to: string, subject: string, content: ISecurityEmailInput) {
    await this.send(to, subject, content);
  }

  async sendVerificationCode(input: {
    to: string;
    username: string;
    purpose: VerificationPurpose;
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    const copy = codeCopy[input.purpose];
    const { delivered } = await this.send(input.to, copy.subject, {
      eyebrow: copy.eyebrow,
      heading: `Your verification code, ${input.username}`,
      paragraphs: [
        `Enter this code in SIEMple to ${copy.action}. It expires in ${input.expiresInMinutes} minutes and works once.`,
      ],
      code: input.code,
      footnote: `Never share this code. SIEMple staff will never ask for it. ${NOT_YOU}`,
    });
    if (!delivered) {
      throw new AppError(AppErrorCode.EMAIL_NOT_DELIVERED, ErrorMessage.EMAIL_NOT_DELIVERED);
    }
  }

  async notifyPasswordChanged(input: { to: string; username: string }): Promise<void> {
    await this.sendNotice(input.to, 'Your SIEMple password was changed', {
      eyebrow: 'Security notice',
      heading: 'Your password was changed',
      paragraphs: [
        `Hi ${input.username}, the password for your SIEMple account was just changed.`,
        'Every other device has been signed out. Sign in again there with your new password.',
      ],
      footnote:
        'Wasn\'t you? Use "Forgot passphrase" on the sign-in page right away and contact your administrator.',
    });
  }

  async notifyEmailChanged(input: {
    oldEmail: string;
    newEmail: string;
    username: string;
  }): Promise<void> {
    await this.sendNotice(input.oldEmail, 'Your SIEMple sign-in email was changed', {
      eyebrow: 'Security notice',
      heading: 'Your sign-in email was changed',
      paragraphs: [
        `Hi ${input.username}, the sign-in email for your SIEMple account was changed from ${input.oldEmail} to ${input.newEmail}.`,
        'From now on, sign in and receive account emails at the new address.',
      ],
      footnote: "Wasn't you? Contact your platform administrator immediately.",
    });
  }
}
