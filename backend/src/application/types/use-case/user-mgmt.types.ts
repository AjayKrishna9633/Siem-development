import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { UserStatus } from '../../../domain/enums/UserStatus.ts';

export interface IManagedUser {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface IUserCounts {
  all: number;
  invited: number;
  disabled: number;
}

export interface IUserPage {
  items: IManagedUser[];
  page: number;
  pageSize: number;
  total: number;
  counts: IUserCounts;
}
