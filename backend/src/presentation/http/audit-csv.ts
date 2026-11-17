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

// A spreadsheet runs a cell that starts with one of these as a formula. Several of these columns
// hold text an outsider chose (the username typed into a failed login, a User-Agent, a request
// id), so `=HYPERLINK(...)` could otherwise run on an admin's machine when they open the export.
// A leading apostrophe makes the program show the text instead of evaluating it.
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
