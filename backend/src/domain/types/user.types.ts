export const USER_ROLES = ['super_admin', 'org_admin', 'analyst'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['invited', 'active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

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
