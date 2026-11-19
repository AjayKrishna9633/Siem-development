import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IIngestKeyRepository } from '../../interfaces/repositories/ingest-key.repository.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { IAuthenticateIngestKeyUseCase } from '../../interfaces/use-cases/ingest.interface.ts';
import type { IAuthenticateIngestKeyInput } from '../../dtos/ingest/request/ingest-request.dto.ts';
import type { IIngestKeyIdentity } from '../../types/use-case/ingest.types.ts';
import { INGEST_KEY_PREFIX, INGEST_LIMITS } from '../../../domain/constants/ingest.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

const KEY_PATTERN = new RegExp(`^${INGEST_KEY_PREFIX}[0-9a-f]{64}$`);

@injectable()
export class AuthenticateIngestKeyUseCase implements IAuthenticateIngestKeyUseCase {
  constructor(
    @inject(TYPES.IngestKeyRepository) private readonly _keys: IIngestKeyRepository,
    @inject(TYPES.OpaqueTokenService) private readonly _tokens: IOpaqueTokenService,
  ) {}

  async execute(input: IAuthenticateIngestKeyInput): Promise<IIngestKeyIdentity> {
    // Anything not shaped like a key is refused before touching the database. Lookup is by
    // hash, so the comparison never sees the key itself and can't leak it through timing.
    if (!KEY_PATTERN.test(input.secret)) throw invalidKey();

    const key = await this._keys.findActiveByHash(this._tokens.hash(input.secret));
    if (!key) throw invalidKey();

    // Coarse on purpose: a busy sender would otherwise write this row on every request.
    const now = new Date();
    if (
      !key.lastUsedAt ||
      now.getTime() - key.lastUsedAt.getTime() >= INGEST_LIMITS.LAST_USED_RESOLUTION_MS
    ) {
      await this._keys.touchLastUsed(key.id, now);
    }

    return { id: key.id, name: key.name };
  }
}

const invalidKey = () =>
  new AppError(AppErrorCode.INVALID_INGEST_KEY, ErrorMessage.INVALID_INGEST_KEY);
