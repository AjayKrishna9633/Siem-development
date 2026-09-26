import type { UserRole, UserProps } from '../../domain/types/user.types.js';

export type CreateSuperAdminDTO = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  now: Date;
};

export type CreateInvitedDTO = {
  id: string;
  organizationId: string; // Required!
  email: string;
  username: string;
  role: Exclude<UserRole, 'super_admin'>; // Required!
  invitedById: string; // Required!
  now: Date;
};

export type UserResponseDTO = Omit<UserProps, 'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockedUntil'>;
