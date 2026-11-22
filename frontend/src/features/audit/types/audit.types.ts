export type AuditCategory = 'auth' | 'user' | 'system' | 'agent' | 'rule' | 'alert';

export type AuditOutcome = 'success' | 'failure' | 'denied';

export type AuditJson =
  string | number | boolean | null | AuditJson[] | { [key: string]: AuditJson };

export type AuditMetadata = Record<string, AuditJson>;

export interface IAuditLog {
  id: string;
  occurredAt: string;
  actor: { id: string | null; username: string | null; role: string | null };
  action: string;
  category: AuditCategory;
  outcome: AuditOutcome;
  target: { type: string | null; id: string | null; label: string | null };
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: AuditMetadata;
}

export interface IAuditPage {
  items: IAuditLog[];
  nextCursor: string | null;
}

export type AuditRange = '24h' | '7d' | '30d' | 'custom';

export interface IAuditFilters {
  range: AuditRange;
  from?: string;
  to?: string;
  category?: AuditCategory;
  outcome?: AuditOutcome;
  actorId?: string;
  q?: string;
}

export interface IAuditQuery {
  from?: string;
  to?: string;
  actorId?: string;
  category?: AuditCategory;
  outcome?: AuditOutcome;
  q?: string;
}

export interface IAuditListParams extends IAuditQuery {
  limit?: number;
  cursor?: string;
}
