import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';

export interface ILoginInput {
  email: string;
  password: string;
  context: IRequestContext;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    permissions: string[];
  };
}

export interface IUserProfileResponse {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  status: string;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}
