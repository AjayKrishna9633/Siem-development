import type { UserProps } from '../../../../domain/types/user.types.ts';

export type UserResponseDTO = Omit<
  UserProps,
  'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockedUntil'
>;
