import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import { UserRole } from '../../domain/enums/UserRole.ts';
import type {
  IEmailService,
  IEmailDelivery,
} from '../../application/interfaces/services/email.service.interface.ts';
import type {
  IAuthMailer,
  IInviteEmail,
  IPasswordResetEmail,
} from '../../application/interfaces/services/auth-mailer.interface.ts';
import { securityEmailHtml, securityEmailText } from './templates/security-email.ts';

const roleTitle: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.T2_ANALYST]: 'Tier 2 Analyst',
  [UserRole.T1_ANALYST]: 'Tier 1 Analyst',
};

const formatExpiry = (date: Date) => date.toUTCString().replace(/:\d{2} GMT$/, ' UTC');

@injectable()
export class AuthMailer implements IAuthMailer {
  constructor(@inject(TYPES.EmailService) private readonly _email: IEmailService) {}

  sendInvite(input: IInviteEmail): Promise<IEmailDelivery> {
    const org = input.orgName ?? 'SIEMple';
    const content = {
      eyebrow: input.replacesEarlier ? 'New invitation link' : 'Invitation',
      heading: `You're invited to ${org} on SIEMple`,
      paragraphs: [
        ...(input.replacesEarlier
          ? ['This is a new link. Any earlier invitation email for this account no longer works.']
          : []),
        `You've been invited as ${roleTitle[input.role]}. Choose your name and a password, and you'll be signed in straight away.`,
        `The link works once and expires ${formatExpiry(input.expiresAt)}.`,
      ],
      action: { label: 'Accept invitation', url: input.link },
      footnote:
        "Weren't expecting this? You can ignore this email; nothing happens unless the link is used.",
    };

    return this._email.send({
      to: input.to,
      subject: input.replacesEarlier
        ? `New invitation link for ${org} on SIEMple`
        : `You're invited to ${org} on SIEMple`,
      text: securityEmailText(content),
      html: securityEmailHtml(content),
    });
  }

  sendPasswordReset(input: IPasswordResetEmail): Promise<IEmailDelivery> {
    const content = {
      eyebrow: 'Password reset',
      heading: `Reset your SIEMple password, ${input.name}`,
      paragraphs: [
        input.byAdmin
          ? 'An administrator sent you this link so you can choose a new password.'
          : 'Someone asked to reset the password for your SIEMple account.',
        `The link works once and expires ${formatExpiry(input.expiresAt)}. Setting a new password signs you out on every device.`,
      ],
      action: { label: 'Choose a new password', url: input.link },
      footnote: "Didn't ask for this? Ignore this email; your password stays the same.",
    };

    return this._email.send({
      to: input.to,
      subject: 'Reset your SIEMple password',
      text: securityEmailText(content),
      html: securityEmailHtml(content),
    });
  }
}
