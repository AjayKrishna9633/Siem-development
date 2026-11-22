import type {
  IAuditCursor,
  IAuditLogFilter,
} from '../../../application/types/use-case/audit.types.ts';

export interface IAuditWhere {
  sql: string;
  // Values for $1, $2, ...; caller input is never concatenated into the SQL.
  params: unknown[];
}

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

export const buildAuditWhere = (
  filter: IAuditLogFilter,
  cursor: IAuditCursor | null = null,
): IAuditWhere => {
  const clauses: string[] = [];
  const params: unknown[] = [];
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
    // Bound as text to keep microseconds; matches the index order.
    clauses.push(
      `(occurred_at, id) < (${param(cursor.occurredAt)}::timestamptz, ${param(cursor.id)}::uuid)`,
    );
  }

  return { sql: `WHERE ${clauses.join(' AND ')}`, params };
};
