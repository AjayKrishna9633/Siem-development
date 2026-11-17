import type { IAuditLog } from '../types/audit.types.ts';

// Rows are not all written by a signed-in person: the system itself (CLI commands) and anonymous
// events (a failed sign-in with an unknown email) have no user behind them.
export const actorName = (actor: IAuditLog['actor']): string => {
  if (actor.username === 'system' && !actor.id) return 'System';
  return actor.username ?? (actor.id ? 'Unknown user' : 'Anonymous');
};
