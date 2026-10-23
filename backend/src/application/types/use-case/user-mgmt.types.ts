import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { UserStatus } from '../../../domain/enums/UserStatus.ts';
import type { IActivationGrant } from '../../interfaces/services/activation.service.interface.ts';
import type { IActor } from './company.types.ts';

export interface ITeamMember {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface IAddTeamMemberInput {
  actor: IActor;
  username: string;
  email: string;
}

export interface IAddTeamMemberResponse {
  member: ITeamMember;
  activation: IActivationGrant;
}

export interface IListTeamMembersInput {
  actor: IActor;
}

export interface IResendActivationInput {
  actor: IActor;
  userId: string;
}

// Public preview for the activation page; deliberately omits the email
export interface IActivationPreview {
  companyName: string;
  username: string;
  role: UserRole;
  expiresAt: string;
}

export interface IActivateAccountInput {
  activationId: string;
  email: string;
  temporaryPassword: string;
  newPassword: string;
}
