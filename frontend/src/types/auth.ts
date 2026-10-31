export type UserRole = 'admin' | 't2_analyst' | 't1_analyst';

export type UserStatus = 'invited' | 'active' | 'disabled';

export interface IUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
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

// One-time credentials the new user activates with
export interface IActivationGrant {
  activationId: string;
  activationLink: string;
  temporaryPassword: string;
  expiresAt: string;
  // False when the activation email couldn't be delivered; share the details by hand
  emailSent: boolean;
}

// An admin adds a team member; the activation is shown once
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
  username: string;
  email: string;
  role: UserRole;
  expiresAt: string;
}

// The temporary-password route hands back the activation ID the link would carry
export interface IVerifiedActivation extends IActivationPreview {
  activationId: string;
}
