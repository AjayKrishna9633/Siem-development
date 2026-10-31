import type { UserRole } from '../../../domain/enums/UserRole.ts';

// The signed-in user performing an action, taken from the access token
export interface IActor {
  userId: string;
  role: UserRole;
}
