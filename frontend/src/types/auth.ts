export type UserRole = 'admin' | 't2_analyst' | 't1_analyst';

export type UserStatus = 'invited' | 'active' | 'disabled';

// Mirrors the backend's Permission enum (domain/enums/Permission.ts)
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
  // Sent with the session and /auth/me; absent on rows in the user list
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
  // On errors: the backend's machine-readable reason, e.g. 'SETUP_REQUIRED'
  code?: string;
}

export interface ILoginResponse {
  accessToken: string;
  user: IUser;
}

// A row in user management. Someone who hasn't accepted their invite has no name yet.
export interface IManagedUser extends Omit<IUser, 'username' | 'permissions'> {
  username: string | null;
  // For invited rows: whether their link has expired (or was never issued), as the server sees it
  inviteExpired?: boolean;
}

// After inviting or resending. `link` is only there when the email wasn't delivered.
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

// Where a verification code was sent (masked for the account's own address)
export interface ICodeSent {
  sentTo: string;
  expiresInMinutes: number;
}

// Shown on the reset page to whoever holds the link
export interface IPasswordResetPreview {
  email: string;
  expiresAt: string;
}

// Shown on the accept-invite page to whoever holds the link
export interface IInvitePreview {
  email: string;
  role: UserRole;
  orgName: string | null;
  expiresAt: string;
}
