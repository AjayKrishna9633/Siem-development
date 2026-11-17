export type AuditCategory = 'auth' | 'user' | 'system' | 'agent' | 'rule' | 'alert';

export type AuditOutcome = 'success' | 'failure' | 'denied';

export type AuditJson =
  string | number | boolean | null | AuditJson[] | { [key: string]: AuditJson };

export type AuditMetadata = Record<string, AuditJson>;

export interface IAuditLog {
  id: string;
  // ISO 8601 with microseconds, e.g. 2026-11-14T12:00:00.123456Z
  occurredAt: string;
  // id is null for the system itself and for anonymous events such as a failed sign-in.
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
  // null on the last page. Opaque: only ever passed back to the server.
  nextCursor: string | null;
}

export type AuditRange = '24h' | '7d' | '30d' | 'custom';

// What the filter bar shows, and what the URL holds. Relative ranges (24h, 7d, 30d) are stored as
// the preset, not as dates, so a bookmarked "last 24 hours" is still the last 24 hours tomorrow.
export interface IAuditFilters {
  range: AuditRange;
  // ISO strings, only used when range is 'custom'.
  from?: string;
  to?: string;
  category?: AuditCategory;
  outcome?: AuditOutcome;
  actorId?: string;
  q?: string;
}

// Query parameters the API accepts.
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
