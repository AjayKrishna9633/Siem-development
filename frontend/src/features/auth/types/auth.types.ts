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

export interface ILoginResponse {
  accessToken: string;
  user: IUser;
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
