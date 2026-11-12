import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { IEmailDelivery } from './email.service.interface.ts';

export interface IInviteEmail {
  to: string;
  role: UserRole;
  orgName: string | null;
  link: string;
  expiresAt: Date;
  replacesEarlier: boolean;
}

export interface IPasswordResetEmail {
  to: string;
  name: string;
  link: string;
  expiresAt: Date;
  byAdmin: boolean;
}

export interface IAuthMailer {
  sendInvite(input: IInviteEmail): Promise<IEmailDelivery>;
  sendPasswordReset(input: IPasswordResetEmail): Promise<IEmailDelivery>;
}
