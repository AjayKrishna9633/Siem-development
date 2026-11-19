import type {
  ILogEntry,
  ILogStoreService,
} from '../../application/interfaces/services/log-store.service.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

interface ILokiLogStoreOptions {
  // Unset: there is no Loki, so every push fails as unavailable.
  url: string | undefined;
  logger: ILogger;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

type LokiValue = [string, string] | [string, string, Record<string, string>];

// Writes straight to Loki's push API and waits for its answer, so a caller is only told "stored"
// once Loki has the events. Nothing is buffered here: an ingest client retries on 503 instead.
export class LokiLogStoreService implements ILogStoreService {
  readonly #pushUrl: string | null;
  readonly #logger: ILogger;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor(options: ILokiLogStoreOptions) {
    this.#pushUrl = options.url ? new URL('/loki/api/v1/push', options.url).toString() : null;
    this.#logger = options.logger;
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    this.#fetch = options.fetch ?? fetch;
  }

  async push(entries: ILogEntry[]): Promise<void> {
    if (entries.length === 0) return;
    if (!this.#pushUrl) {
      this.#logger.warn('Ingest refused: LOKI_URL is not set');
      throw unavailable();
    }

    let response: Response;
    try {
      response = await this.#fetch(this.#pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streams: toStreams(entries) }),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (err) {
      this.#logger.warn('Loki push failed', { err });
      throw unavailable();
    }

    if (response.ok) return;
    const detail = (await response.text().catch(() => '')).slice(0, 500);
    // Starting up, overloaded or failing: the events are fine, the client should retry.
    if (response.status === 429 || response.status >= 500) {
      this.#logger.warn('Loki push failed', { status: response.status, detail });
      throw unavailable();
    }
    // Loki refused the events themselves. The validator should have caught this, so say why.
    this.#logger.warn('Loki rejected ingested events', { status: response.status, detail });
    throw new AppError(
      AppErrorCode.LOG_STORE_REJECTED,
      detail ? `${ErrorMessage.LOG_STORE_REJECTED}: ${detail}` : ErrorMessage.LOG_STORE_REJECTED,
    );
  }
}

const unavailable = () =>
  new AppError(AppErrorCode.LOG_STORE_UNAVAILABLE, ErrorMessage.LOG_STORE_UNAVAILABLE);

// Loki takes one stream per distinct label set; entries keep their order inside each.
const toStreams = (entries: ILogEntry[]) => {
  const streams = new Map<string, { stream: Record<string, string>; values: LokiValue[] }>();
  for (const entry of entries) {
    const labels = Object.fromEntries(
      Object.entries(entry.labels).sort(([a], [b]) => a.localeCompare(b)),
    );
    const key = JSON.stringify(labels);
    const target = streams.get(key) ?? { stream: labels, values: [] };
    const ts = `${entry.timestamp.getTime()}000000`;
    target.values.push(entry.metadata ? [ts, entry.line, entry.metadata] : [ts, entry.line]);
    streams.set(key, target);
  }
  return [...streams.values()];
};
