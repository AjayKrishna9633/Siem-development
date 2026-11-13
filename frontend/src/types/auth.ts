import type { IUser, UserRole, UserStatus } from '@/features/auth';

export interface IApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success?: boolean;
  code?: string;
}

export interface IManagedUser extends Omit<IUser, 'username' | 'permissions'> {
  username: string | null;
  inviteExpired?: boolean;
}

export type UserSortKey = 'name' | 'email' | 'role' | 'status' | 'lastLogin';

export interface IUserListParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy: UserSortKey;
  sortDir: 'asc' | 'desc';
}

export interface IUserPage {
  items: IManagedUser[];
  page: number;
  pageSize: number;
  total: number;
  counts: { all: number; invited: number; disabled: number };
}

export interface ILinkDelivery {
  delivered: boolean;
  expiresAt: string;
  link?: string;
}

export interface IInviteResult {
  user: IManagedUser;
  invite: ILinkDelivery;
}

export interface IPendingInvite {
  userId: string;
  email: string;
  role: UserRole;
  invitedAt: string;
  expiresAt: string | null;
  expired: boolean;
}

export interface ICodeSent {
  sentTo: string;
  expiresInMinutes: number;
}
