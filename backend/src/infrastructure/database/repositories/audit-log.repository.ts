import { injectable, inject } from 'inversify';
import type { DataSource } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type {
  IAuditEntry,
  IAuditLogRepository,
} from '../../../application/interfaces/repositories/audit-log.repository.interface.ts';
import { AuditLogModel } from '../models/audit-log.model.ts';

@injectable()
export class TypeOrmAuditLogRepository implements IAuditLogRepository {
  constructor(@inject(TYPES.DataSource) private readonly db: DataSource) {}

  async append(entry: IAuditEntry): Promise<void> {
    const repository = this.db.getRepository(AuditLogModel);
    // insert(), never save(): save() may issue an UPDATE, which the table rejects
    await repository.insert(
      repository.create({
        actorUserId: entry.actorUserId,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ip: entry.context.ip,
        userAgent: entry.context.userAgent,
        metadata: entry.metadata ?? {},
      }),
    );
  }
}
