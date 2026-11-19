import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IIngestKeyRepository } from '../../interfaces/repositories/ingest-key.repository.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { ICreateIngestKeyUseCase } from '../../interfaces/use-cases/ingest-keys.interface.ts';
import type { ICreateIngestKeyInput } from '../../dtos/ingest-key/request/ingest-key-request.dto.ts';
import type { ICreatedIngestKey } from '../../types/use-case/ingest-key.types.ts';
import {
  INGEST_KEY_NAME_PATTERN,
  INGEST_KEY_PREFIX,
  INGEST_KEY_PREFIX_LENGTH,
  MAX_ACTIVE_INGEST_KEYS,
} from '../../../domain/constants/ingest.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertCanManageIngestKeys, ingestAuditActor, toIngestKey } from './ingest-key-view.ts';

@injectable()
export class CreateIngestKeyUseCase implements ICreateIngestKeyUseCase {
  constructor(
    @inject(TYPES.IngestKeyRepository) private readonly _keys: IIngestKeyRepository,
    @inject(TYPES.OpaqueTokenService) private readonly _tokens: IOpaqueTokenService,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  async execute(input: ICreateIngestKeyInput): Promise<ICreatedIngestKey> {
    assertCanManageIngestKeys(input.actor);

    // The route's schema checks this too; the server command arrives here unchecked.
    const name = input.name.trim().toLowerCase();
    if (!INGEST_KEY_NAME_PATTERN.test(name)) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.INGEST_KEY_NAME_INVALID);
    }
    if (await this._keys.findActiveByName(name)) {
      throw new AppError(AppErrorCode.INGEST_KEY_NAME_TAKEN, ErrorMessage.INGEST_KEY_NAME_TAKEN);
    }
    if ((await this._keys.countActive()) >= MAX_ACTIVE_INGEST_KEYS) {
      throw new AppError(
        AppErrorCode.INGEST_KEY_LIMIT_REACHED,
        ErrorMessage.INGEST_KEY_LIMIT_REACHED,
      );
    }

    const secret = `${INGEST_KEY_PREFIX}${this._tokens.generate().token}`;
    const record = await this._keys.create({
      name,
      keyPrefix: secret.slice(0, INGEST_KEY_PREFIX_LENGTH),
      keyHash: this._tokens.hash(secret),
      createdBy: input.actor?.userId ?? null,
    });

    await this._audit.record({
      action: AuditAction.INGEST_KEY_CREATED,
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

    return { key: toIngestKey(record), secret };
  }
}
