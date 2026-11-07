export type UserRole = 'admin' | 't2_analyst' | 't1_analyst';

export type UserStatus = 'invited' | 'active' | 'disabled';

export type Permission =
  | 'alerts.view'
  | 'alerts.triage'
  | 'alerts.close_fp'
  | 'alerts.work_escalated'
  | 'rules.edit'
  | 'users.manage'
  | 'settings.manage'
  | 'audit.view';

export interface IUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  permissions?: Permission[];
  status?: UserStatus;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface IApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success?: boolean;
  code?: string;
}

export interface ILoginResponse {
  accessToken: string;
  user: IUser;
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

export interface IPasswordResetPreview {
  email: string;
  expiresAt: string;
}

export interface IInvitePreview {
  email: string;
  role: UserRole;
  orgName: string | null;
  expiresAt: string;
}
