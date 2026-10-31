import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IActor } from './actor.types.ts';
import type { IManagedUser } from './user-mgmt.types.ts';

// What the admin sees after inviting or resending. `link` is present only when the
// email wasn't delivered, so the admin can pass it on themselves.
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

// Resend or revoke one person's invitation
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
  // Null if the person has no live link (e.g. it was never issued); resend fixes it
  expiresAt: Date | null;
  expired: boolean;
}

// Shown on the accept page, to whoever holds the link
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
