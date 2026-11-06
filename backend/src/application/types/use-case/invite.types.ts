import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IActor } from './actor.types.ts';
import type { IManagedUser } from './user-mgmt.types.ts';

export interface IInviteDelivery {
  delivered: boolean;
  expiresAt: Date;
  link?: string;
}

export interface IInviteUserInput {
  actor: IActor;
  email: string;
  role: UserRole;
  context: IRequestContext;
}

export interface IInviteResult {
  user: IManagedUser;
  invite: IInviteDelivery;
}

export interface IManageInviteInput {
  actor: IActor;
  userId: string;
  context: IRequestContext;
}

export interface IPendingInvite {
  userId: string;
  email: string;
  role: UserRole;
  invitedById: string | null;
  invitedAt: Date;
  expiresAt: Date | null;
  expired: boolean;
}

export interface IInvitePreview {
  email: string;
  role: UserRole;
  orgName: string | null;
  expiresAt: Date;
}

export interface IAcceptInviteInput {
  token: string;
  name: string;
  password: string;
  context: IRequestContext;
}
