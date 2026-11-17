import type {
  IAuditCursor,
  IAuditLogFilter,
} from '../../../application/types/use-case/audit.types.ts';

export interface IAuditWhere {
  // Starts with `WHERE`. Always has at least the date range, so it is never empty.
  sql: string;
  // Positional values for the $1, $2, ... in `sql`. Nothing from the caller is ever concatenated
  // into the SQL text itself.
  params: unknown[];
}

// Escape the LIKE wildcards so a search for "100%" or "a_b" matches those characters literally.
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

// Pure (no database), so the filter-to-SQL mapping is unit-tested without one. Used by the page
// query, the export and the count, so all three always agree on what "matches" means.
export const buildAuditWhere = (
  filter: IAuditLogFilter,
  cursor: IAuditCursor | null = null,
): IAuditWhere => {
  const clauses: string[] = [];
  const params: unknown[] = [];
  // Registers a value and returns its placeholder.
  const param = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  clauses.push(`occurred_at >= ${param(filter.from)}`);
  clauses.push(`occurred_at <= ${param(filter.to)}`);
  if (filter.actorId) clauses.push(`actor_id = ${param(filter.actorId)}`);
  if (filter.category) clauses.push(`category = ${param(filter.category)}`);
  if (filter.action) clauses.push(`action = ${param(filter.action)}`);
  if (filter.outcome) clauses.push(`outcome = ${param(filter.outcome)}`);
  if (filter.q) {
    const like = param(`%${escapeLike(filter.q)}%`);
    clauses.push(
      `(actor_username ILIKE ${like} OR target_label ILIKE ${like} OR action ILIKE ${like})`,
    );
  }
  if (cursor) {
    // The timestamp is bound as text and cast in SQL, so it keeps its microseconds. Row
    // comparison matches the index order (occurred_at DESC, id DESC).
    clauses.push(
      `(occurred_at, id) < (${param(cursor.occurredAt)}::timestamptz, ${param(cursor.id)}::uuid)`,
    );
  }

  return { sql: `WHERE ${clauses.join(' AND ')}`, params };
};
