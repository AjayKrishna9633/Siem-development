import type { IActivationGrant } from './company.ts';

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
  // From /auth/me; null for the super admin, who belongs to no company
  companyName?: string | null;
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

// A company admin adds an analyst; the activation is shown once
export interface ITeamMemberWithActivation {
  member: IUser;
  activation: IActivationGrant;
}

// Where a verification code was sent (masked for the account's own address)
export interface ICodeSent {
  sentTo: string;
  expiresInMinutes: number;
}

// Who is being activated, shown on the set-password step
export interface IActivationPreview {
  companyName: string;
  username: string;
  email: string;
  role: UserRole;
  expiresAt: string;
}

// The temporary-password route hands back the activation ID the link would carry
export interface IVerifiedActivation extends IActivationPreview {
  activationId: string;
}
