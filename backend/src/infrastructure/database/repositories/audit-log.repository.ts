import { injectable, inject } from 'inversify';
import type { DataSource, EntityManager } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type {
  IAuditLogRepository,
  IAuditRecord,
} from '../../../application/interfaces/repositories/audit-log.repository.interface.ts';
import type {
  IAuditCursor,
  IAuditLogEntry,
  IAuditLogFilter,
} from '../../../application/types/use-case/audit.types.ts';
import type { AuditCategory } from '../../../domain/enums/AuditCategory.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import type { AuditMetadata } from '../../../domain/types/audit.types.ts';
import { AuditLogModel } from '../models/audit-log.model.ts';
import { toAuditRow } from '../mappers/audit-record.mapper.ts';
import { buildAuditWhere } from '../queries/audit-log.query.ts';

export const insertAuditRecord = async (
  manager: EntityManager,
  record: IAuditRecord,
): Promise<void> => {
  const repository = manager.getRepository(AuditLogModel);
  await repository.insert(repository.create(toAuditRow(record)));
};

// Read as text: a JS Date would drop the microseconds.
const SELECT_COLUMNS = `
  id,
  to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS occurred_at,
  actor_id, actor_username, actor_role, action, category, outcome,
  target_type, target_id, target_label, ip_address, user_agent, request_id, metadata`;

interface IAuditRow {
  id: string;
  occurred_at: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_role: string | null;
  action: string;
  category: AuditCategory;
  outcome: AuditOutcome;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  metadata: AuditMetadata;
}

const toEntry = (row: IAuditRow): IAuditLogEntry => ({
  id: row.id,
  occurredAt: row.occurred_at,
  actorId: row.actor_id,
  actorUsername: row.actor_username,
  actorRole: row.actor_role,
  action: row.action,
  category: row.category,
  outcome: row.outcome,
  targetType: row.target_type,
  targetId: row.target_id,
  targetLabel: row.target_label,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  requestId: row.request_id,
  metadata: row.metadata,
});

@injectable()
export class TypeOrmAuditLogRepository implements IAuditLogRepository {
  constructor(@inject(TYPES.DataSource) private readonly _db: DataSource) {}

  insert(record: IAuditRecord): Promise<void> {
    return insertAuditRecord(this._db.manager, record);
  }

  async findPage(
    filter: IAuditLogFilter,
    cursor: IAuditCursor | null,
    limit: number,
  ): Promise<IAuditLogEntry[]> {
    const where = buildAuditWhere(filter, cursor);
    const rows = await this._db.query<IAuditRow[]>(
      `SELECT ${SELECT_COLUMNS}
         FROM audit_logs
         ${where.sql}
        ORDER BY occurred_at DESC, id DESC
        LIMIT $${where.params.length + 1}`,
      [...where.params, limit],
    );
    return rows.map(toEntry);
  }

  async findById(id: string): Promise<IAuditLogEntry | null> {
    const [row] = await this._db.query<IAuditRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM audit_logs WHERE id = $1`,
      [id],
    );
    return row ? toEntry(row) : null;
  }

  async countUpTo(filter: IAuditLogFilter, cap: number): Promise<number> {
    const where = buildAuditWhere(filter);
    const [row] = await this._db.query<{ count: number }[]>(
      `SELECT count(*)::int AS count
         FROM (SELECT 1 FROM audit_logs ${where.sql} LIMIT $${where.params.length + 1}) matching`,
      [...where.params, cap],
    );
    return row?.count ?? 0;
  }
}
