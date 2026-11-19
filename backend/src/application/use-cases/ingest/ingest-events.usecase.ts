import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type {
  ILogEntry,
  ILogStoreService,
} from '../../interfaces/services/log-store.service.interface.ts';
import type { IIngestEventsUseCase } from '../../interfaces/use-cases/ingest.interface.ts';
import type { IIngestEventsInput } from '../../dtos/ingest/request/ingest-request.dto.ts';
import type { IIngestEvent, IIngestResult } from '../../types/use-case/ingest.types.ts';
import { INGEST_LIMITS, INGEST_SERVICE_LABEL } from '../../../domain/constants/ingest.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// The stored line is one JSON object: the message first, then the sender's fields. A field
// called "message" can't replace the message.
const toLine = (event: IIngestEvent): string => {
  const fields = Object.entries(event.fields ?? {}).filter(([name]) => name !== 'message');
  return JSON.stringify({ message: event.message, ...Object.fromEntries(fields) });
};

@injectable()
export class IngestEventsUseCase implements IIngestEventsUseCase {
  constructor(@inject(TYPES.LogStoreService) private readonly _store: ILogStoreService) {}

  async execute(input: IIngestEventsInput): Promise<IIngestResult> {
    const entries: ILogEntry[] = input.events.map((event, index) => {
      const line = toLine(event);
      if (Buffer.byteLength(line) > INGEST_LIMITS.MAX_LINE_BYTES) {
        throw new AppError(
          AppErrorCode.VALIDATION_ERROR,
          `${ErrorMessage.INGEST_LINE_TOO_LONG} (events.${index})`,
        );
      }
      return {
        // Only these three are labels; everything the sender chose stays inside the line.
        labels: { service: INGEST_SERVICE_LABEL, source: input.key.name, level: event.level },
        timestamp: event.timestamp,
        line,
        ...(input.requestId && { metadata: { request_id: input.requestId } }),
      };
    });

    // All or nothing: either Loki has the whole batch or the sender is told to retry it.
    await this._store.push(entries);
    return { accepted: entries.length };
  }
}
