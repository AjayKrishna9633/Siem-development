import type { IActor } from '../../../types/use-case/actor.types.ts';
import type { IRequestContext } from '../../../interfaces/repositories/audit-log.repository.interface.ts';
import type { UserRole } from '../../../../domain/enums/UserRole.ts';
import type { UserStatus } from '../../../../domain/enums/UserStatus.ts';

export interface IUpdateProfileDTO {
  id: string;
  username?: string;
  now: Date;
}

export type UserSortKey = 'name' | 'email' | 'role' | 'status' | 'lastLogin';

export interface IUserListQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy: UserSortKey;
  sortDir: 'asc' | 'desc';
}

export interface IListUsersInput {
  actor: IActor;
  query: IUserListQuery;
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
