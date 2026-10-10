import type { UserRole } from '../enums/UserRole.js';
import type { UserStatus } from '../enums/UserStatus.js';

export interface UserProps {
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
