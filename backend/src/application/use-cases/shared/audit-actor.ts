import type { User } from '../../../domain/entities/user.entity.ts';
import type { IAuditActor } from '../../../domain/types/audit.types.ts';

export const auditActorOf = (user: User): IAuditActor => ({
  userId: user.id,
  username: user.displayName,
  role: user.role,
});
