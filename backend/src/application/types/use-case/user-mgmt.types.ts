import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { UserStatus } from '../../../domain/enums/UserStatus.ts';
import type { IActor } from './actor.types.ts';
import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';

export interface IManagedUser {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface IListUsersInput {
  actor: IActor;
}

export interface IChangeUserRoleInput {
  actor: IActor;
  userId: string;
  role: UserRole;
  context: IRequestContext;
}

export interface ISetUserStatusInput {
  actor: IActor;
  userId: string;
  enabled: boolean;
  context: IRequestContext;
}
