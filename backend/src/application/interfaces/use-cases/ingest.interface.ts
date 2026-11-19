import type {
  IAuthenticateIngestKeyInput,
  IIngestEventsInput,
} from '../../dtos/ingest/request/ingest-request.dto.ts';
import type { IIngestKeyIdentity, IIngestResult } from '../../types/use-case/ingest.types.ts';

export interface IAuthenticateIngestKeyUseCase {
  // Throws INVALID_INGEST_KEY for a missing, unknown or revoked key.
  execute(input: IAuthenticateIngestKeyInput): Promise<IIngestKeyIdentity>;
}

export interface IIngestEventsUseCase {
  execute(input: IIngestEventsInput): Promise<IIngestResult>;
}
