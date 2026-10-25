import type { UserRole } from '../enums/UserRole.ts';
import type { UserStatus } from '../enums/UserStatus.ts';

export interface IUserProps {
  id: string;
  organizationId: string | null;
  email: string;
  username: string;
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

// What the domain needs to create each kind of user. Defined here, not in the
// application layer, so the entity depends on nothing outside the domain.
export interface ICreateSuperAdminProps {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  now: Date;
}

export interface ICreateInvitedUserProps {
  id: string;
  organizationId: string;
  email: string;
  username: string;
  role: Exclude<UserRole, UserRole.SUPER_ADMIN>;
  invitedById: string;
  now: Date;
}
