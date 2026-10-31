import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { UserStatus } from '../../../domain/enums/UserStatus.ts';
import type { IActivationGrant } from '../../interfaces/services/activation.service.interface.ts';
import type { IActor } from './actor.types.ts';

export interface IManagedUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface IAddUserInput {
  actor: IActor;
  role: UserRole;
  username: string;
  email: string;
}

export interface IAddUserResponse {
  member: IManagedUser;
  activation: IActivationGrant;
}

export interface IListUsersInput {
  actor: IActor;
}

export interface IResendActivationInput {
  actor: IActor;
  userId: string;
}

// Shown on the set-password step; only someone holding the link (or the
// email + temporary password that unlock it) can see it
export interface IActivationPreview {
  username: string;
  email: string;
  role: UserRole;
  expiresAt: string;
}

export interface IVerifyActivationInput {
  email: string;
  temporaryPassword: string;
}

// Hands back the activation ID so the temporary-password route joins the link route
export interface IVerifiedActivation extends IActivationPreview {
  activationId: string;
}

export interface IActivateAccountInput {
  activationId: string;
  newPassword: string;
}
