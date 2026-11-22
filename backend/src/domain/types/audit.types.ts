export type AuditJson =
  string | number | boolean | null | AuditJson[] | { [key: string]: AuditJson };

export type AuditMetadata = Record<string, AuditJson>;

export interface IAuditActor {
  userId: string | null;
  username: string;
  role: string | null;
}
