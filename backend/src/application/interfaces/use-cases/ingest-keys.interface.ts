import type {
  ICreateIngestKeyInput,
  IRevokeIngestKeyInput,
} from '../../dtos/ingest-key/request/ingest-key-request.dto.ts';
import type { ICreatedIngestKey, IIngestKey } from '../../types/use-case/ingest-key.types.ts';
import type { IActor } from '../../types/use-case/actor.types.ts';

export interface ICreateIngestKeyUseCase {
  execute(input: ICreateIngestKeyInput): Promise<ICreatedIngestKey>;
}

export interface IListIngestKeysUseCase {
  // actor null: the server command (see ICreateIngestKeyInput).
  execute(input: { actor: IActor | null }): Promise<IIngestKey[]>;
}

export interface IRevokeIngestKeyUseCase {
  execute(input: IRevokeIngestKeyInput): Promise<IIngestKey>;
}
