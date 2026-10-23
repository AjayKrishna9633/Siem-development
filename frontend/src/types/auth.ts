export type UserRole = 'super_admin' | 'org_admin' | 'analyst';

export type UserStatus = 'invited' | 'active' | 'disabled';

export interface IUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  organizationId: string | null;
  status?: UserStatus;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface IApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success?: boolean;
}

export interface ILoginResponse {
  accessToken: string;
  user: IUser;
}

export interface IInviteResponse {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  organizationId: string | null;
  inviteToken: string;
  inviteLink: string;
}

export interface IVerifyInviteResponse {
  valid: boolean;
  email: string;
  username: string;
  role: UserRole;
  organizationId: string | null;
}
