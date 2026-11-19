import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IIngestKeyRepository } from '../../interfaces/repositories/ingest-key.repository.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IRevokeIngestKeyUseCase } from '../../interfaces/use-cases/ingest-keys.interface.ts';
import type { IRevokeIngestKeyInput } from '../../dtos/ingest-key/request/ingest-key-request.dto.ts';
import type { IIngestKey } from '../../types/use-case/ingest-key.types.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertCanManageIngestKeys, ingestAuditActor, toIngestKey } from './ingest-key-view.ts';

@injectable()
export class RevokeIngestKeyUseCase implements IRevokeIngestKeyUseCase {
  constructor(
    @inject(TYPES.IngestKeyRepository) private readonly _keys: IIngestKeyRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  async execute(input: IRevokeIngestKeyInput): Promise<IIngestKey> {
    assertCanManageIngestKeys(input.actor);

    // Unknown and already-revoked read the same: either way there is nothing left to revoke.
    const record = await this._keys.revoke(input.id, input.actor?.userId ?? null, new Date());
    if (!record) {
      throw new AppError(AppErrorCode.INGEST_KEY_NOT_FOUND, ErrorMessage.INGEST_KEY_NOT_FOUND);
    }

    await this._audit.record({
      action: AuditAction.INGEST_KEY_REVOKED,
      actor: ingestAuditActor(input.actor),
      targetType: AuditTargetType.INGEST_KEY,
      targetId: record.id,
      targetLabel: record.name,
      metadata: {
        name: record.name,
        keyPrefix: record.keyPrefix,
        ...(input.actor === null && { via: 'cli' }),
      },
    });

    return toIngestKey(record);
  }
}
