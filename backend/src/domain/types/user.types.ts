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
