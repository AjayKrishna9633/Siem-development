import type { UserRole } from '../../../domain/enums/UserRole.ts';

import type { IManagedUser } from './user-mgmt.types.ts';

export interface IInviteDelivery {
  delivered: boolean;
  expiresAt: Date;
  link?: string;
}

export interface IInviteResult {
  user: IManagedUser;
  invite: IInviteDelivery;
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
