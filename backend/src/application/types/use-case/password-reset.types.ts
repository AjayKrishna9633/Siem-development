import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IActor } from './actor.types.ts';

export interface IRequestPasswordResetInput {
  email: string;
  context: IRequestContext;
}

// Shown on the reset page, to whoever holds the link
export interface IPasswordResetPreview {
  email: string;
  expiresAt: Date;
}

export interface IResetPasswordInput {
  token: string;
  password: string;
  context: IRequestContext;
}

export interface IIssueResetLinkInput {
  actor: IActor;
  userId: string;
  context: IRequestContext;
}

// What the admin sees: `link` only when the email to the user wasn't delivered
export interface IResetLinkDelivery {
  delivered: boolean;
  expiresAt: Date;
  link?: string;
}

// For the reset-admin command: always the link, since it is printed in the terminal
export interface IRecoveryLink {
  link: string;
  expiresAt: Date;
}
