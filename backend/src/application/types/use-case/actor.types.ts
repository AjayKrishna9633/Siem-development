import type { UserRole } from '../../../domain/enums/UserRole.ts';

export interface IActor {
  userId: string;
  role: UserRole;
}
