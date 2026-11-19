import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IIngestKeyRepository } from '../../interfaces/repositories/ingest-key.repository.interface.ts';
import type { IListIngestKeysUseCase } from '../../interfaces/use-cases/ingest-keys.interface.ts';
import type { IIngestKey } from '../../types/use-case/ingest-key.types.ts';
import type { IActor } from '../../types/use-case/actor.types.ts';
import { assertCanManageIngestKeys, toIngestKey } from './ingest-key-view.ts';

@injectable()
export class ListIngestKeysUseCase implements IListIngestKeysUseCase {
  constructor(@inject(TYPES.IngestKeyRepository) private readonly _keys: IIngestKeyRepository) {}

  async execute(input: { actor: IActor | null }): Promise<IIngestKey[]> {
    assertCanManageIngestKeys(input.actor);
    return (await this._keys.findAll()).map(toIngestKey);
  }
}
