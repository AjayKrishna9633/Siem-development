import { UserRole } from '../enums/UserRole.ts';

// bcrypt only reads the first 72 bytes, so anything longer would be silently truncated
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 8;
// The platform owner's account controls every company, so it needs a longer password.
// Applied everywhere a super admin's password is set: setup, change and reset.
export const SUPER_ADMIN_PASSWORD_MIN_LENGTH = 12;

export const minPasswordLength = (role: UserRole): number =>
  role === UserRole.SUPER_ADMIN ? SUPER_ADMIN_PASSWORD_MIN_LENGTH : PASSWORD_MIN_LENGTH;

// Emails are compared and stored in this one form
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
