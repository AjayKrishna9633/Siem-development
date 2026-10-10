import type { UserProps } from '../../../../domain/types/user.types.js';

export type UserResponseDTO = Omit<UserProps, 'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockedUntil'>;
