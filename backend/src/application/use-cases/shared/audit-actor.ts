import type { User } from '../../../domain/entities/user.entity.ts';
import type { IAuditActor } from '../../../domain/types/audit.types.ts';

// For events where the person acting is not authenticated on the request yet (sign-in, accepting
// an invite, finishing a reset), so AuditService can't pick them up from the request itself.
export const auditActorOf = (user: User): IAuditActor => ({
  userId: user.id,
  username: user.displayName,
  role: user.role,
});
