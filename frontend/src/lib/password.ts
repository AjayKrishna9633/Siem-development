import type { UserRole } from '../types/auth.ts';

// Mirrors the backend's credentials policy (domain/policies/credentials.policy.ts)
export const PASSWORD_MIN_LENGTH = 8;
export const SUPER_ADMIN_PASSWORD_MIN_LENGTH = 12;

export const minPasswordLength = (role?: UserRole): number =>
  role === 'super_admin' ? SUPER_ADMIN_PASSWORD_MIN_LENGTH : PASSWORD_MIN_LENGTH;

// The first problem with a new password and its confirmation, or null when it's fine
export const newPasswordError = (
  password: string,
  confirmation: string,
  minLength = PASSWORD_MIN_LENGTH,
): string | null => {
  if (password.length < minLength) return `Password must be at least ${minLength} characters.`;
  if (password !== confirmation) return "Passwords don't match.";
  return null;
};
