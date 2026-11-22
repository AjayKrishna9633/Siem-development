import type { IAuditCursor } from '../../types/use-case/audit.types.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeAuditCursor = (cursor: IAuditCursor): string =>
  Buffer.from(JSON.stringify({ t: cursor.occurredAt, i: cursor.id })).toString('base64url');

const invalid = () =>
  new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AUDIT_CURSOR_INVALID);

export const decodeAuditCursor = (raw: string): IAuditCursor => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  if (typeof parsed !== 'object' || parsed === null) throw invalid();

  const { t, i } = parsed as Record<string, unknown>;
  if (typeof t !== 'string' || !TIMESTAMP.test(t)) throw invalid();
  if (typeof i !== 'string' || !UUID.test(i)) throw invalid();
  return { occurredAt: t, id: i };
};
