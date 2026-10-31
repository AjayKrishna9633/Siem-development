import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { IEmailDelivery } from './email.service.interface.ts';

export interface IInviteEmail {
  to: string;
  role: UserRole;
  orgName: string | null;
  link: string;
  expiresAt: Date;
  // A resend: the email says the earlier link no longer works
  replacesEarlier: boolean;
}

export interface IPasswordResetEmail {
  to: string;
  name: string;
  link: string;
  expiresAt: Date;
  // Sent because an admin generated it, rather than the person asking
  byAdmin: boolean;
}

// Emails that carry a single-use link. Delivery is reported, never thrown: when it
// fails the caller hands the link to the admin instead.
export interface IAuthMailer {
  sendInvite(input: IInviteEmail): Promise<IEmailDelivery>;
  sendPasswordReset(input: IPasswordResetEmail): Promise<IEmailDelivery>;
}
