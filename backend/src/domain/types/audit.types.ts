// Anything that survives JSON.stringify. The audit metadata column is jsonb, so a before/after
// diff can be nested, not just flat key/value pairs.
export type AuditJson =
  string | number | boolean | null | AuditJson[] | { [key: string]: AuditJson };

export type AuditMetadata = Record<string, AuditJson>;

// Who did it, as it should read in the log forever: copied at write time, so renaming or deleting
// the user later doesn't rewrite history. userId and role are null for the system itself.
export interface IAuditActor {
  userId: string | null;
  username: string;
  role: string | null;
}
