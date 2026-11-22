import type { IAuditLog } from '../types/audit.types.ts';

export const actorName = (actor: IAuditLog['actor']): string => {
  if (actor.username === 'system' && !actor.id) return 'System';
  return actor.username ?? (actor.id ? 'Unknown user' : 'Anonymous');
};
