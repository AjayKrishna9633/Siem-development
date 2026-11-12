import type { UserRole } from '../enums/UserRole.ts';
import type { UserStatus } from '../enums/UserStatus.ts';

export interface IUserProps {
  id: string;
  email: string;
  username: string | null;
  passwordHash: string | null;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  tokenVersion: number;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  invitedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export type UserProps = IUserProps;

export interface ICreateFirstAdminProps {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  now: Date;
}

export interface ICreateInvitedUserProps {
  id: string;
  email: string;
  role: UserRole;
  invitedById: string;
  now: Date;
}
