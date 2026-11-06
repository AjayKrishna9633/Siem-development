import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IActor } from './actor.types.ts';

export interface IRequestPasswordResetInput {
  email: string;
  context: IRequestContext;
}

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

export interface IResetLinkDelivery {
  delivered: boolean;
  expiresAt: Date;
  link?: string;
}

export interface IRecoveryLink {
  link: string;
  expiresAt: Date;
}
