import type { IAuditLogEntry } from '../../application/types/use-case/audit.types.ts';

export const AUDIT_CSV_HEADER = [
  'occurred_at',
  'actor_username',
  'actor_role',
  'actor_id',
  'action',
  'category',
  'outcome',
  'target_type',
  'target_id',
  'target_label',
  'ip_address',
  'user_agent',
  'request_id',
  'metadata',
  'id',
] as const;

// Cells starting with these run as formulas; a leading ' stops CSV injection.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export const csvCell = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const text = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const csvLine = (cells: ReadonlyArray<string | null | undefined>): string =>
  `${cells.map(csvCell).join(',')}\r\n`;

export const auditCsvRow = (entry: IAuditLogEntry): string =>
  csvLine([
    entry.occurredAt,
    entry.actorUsername,
    entry.actorRole,
    entry.actorId,
    entry.action,
    entry.category,
    entry.outcome,
    entry.targetType,
    entry.targetId,
    entry.targetLabel,
    entry.ipAddress,
    entry.userAgent,
    entry.requestId,
    JSON.stringify(entry.metadata),
    entry.id,
  ]);
