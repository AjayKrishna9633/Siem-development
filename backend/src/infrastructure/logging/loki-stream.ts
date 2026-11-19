import { Writable } from 'node:stream';

// Sends pino's JSON lines to Loki's push API in batches. Used as a second destination next to
// stdout, so the console output never depends on Loki. When Loki can't be reached the lines are
// kept (up to maxBuffered, oldest dropped first) and sent once it is back, so the logs written
// while Loki is still starting up are not lost.

export interface ILokiStreamOptions {
  /** Loki's base address, e.g. http://loki:3100 */
  url: string;
  /** Added to every line. Keep these few and fixed: each distinct set is a separate Loki stream. */
  labels: Record<string, string>;
  flushIntervalMs?: number;
  /** Most lines sent in one request. */
  maxBatch?: number;
  /** Most lines kept while Loki is unreachable. */
  maxBuffered?: number;
  timeoutMs?: number;
  /** Replaceable for tests. */
  fetch?: typeof fetch;
  /** Where the stream reports its own problems. Not the logger: that would loop back here. */
  warn?: (message: string) => void;
}

interface IEntry {
  level: string;
  /** Unix time in nanoseconds, as Loki wants it. */
  ts: string;
  line: string;
  requestId?: string;
}

type LokiValue = [string, string] | [string, string, Record<string, string>];

const LEVEL_NAMES: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

const defaultWarn = (message: string) => {
  process.stderr.write(
    `${JSON.stringify({ level: 40, time: new Date().toISOString(), service: 'siemple-backend', msg: message })}\n`,
  );
};

export class LokiStream extends Writable {
  readonly #pushUrl: string;
  readonly #labels: Record<string, string>;
  readonly #maxBatch: number;
  readonly #maxBuffered: number;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;
  readonly #warn: (message: string) => void;
  readonly #timer: NodeJS.Timeout;

  #buffer: IEntry[] = [];
  #inFlight: Promise<void> | null = null;
  #unreachable = false;
  #dropped = 0;

  constructor(options: ILokiStreamOptions) {
    super({ decodeStrings: false });
    this.#pushUrl = new URL('/loki/api/v1/push', options.url).toString();
    this.#labels = options.labels;
    this.#maxBatch = options.maxBatch ?? 1000;
    this.#maxBuffered = options.maxBuffered ?? 10_000;
    this.#timeoutMs = options.timeoutMs ?? 5000;
    this.#fetch = options.fetch ?? fetch;
    this.#warn = options.warn ?? defaultWarn;
    this.#timer = setInterval(() => void this.flush(), options.flushIntervalMs ?? 2000);
    // A pending flush must not keep a finished process (a CLI command) alive.
    this.#timer.unref();
  }

  override _write(chunk: unknown, _encoding: BufferEncoding, done: (error?: Error) => void): void {
    for (const line of String(chunk).split('\n')) {
      if (line) this.#accept(line);
    }
    if (this.#buffer.length >= this.#maxBatch) void this.flush();
    done();
  }

  override _final(done: (error?: Error) => void): void {
    clearInterval(this.#timer);
    void this.flush().finally(() => done());
  }

  /** Sends everything buffered. Resolves when done or when Loki failed; never rejects. */
  flush(): Promise<void> {
    this.#inFlight ??= this.#drain().finally(() => {
      this.#inFlight = null;
    });
    return this.#inFlight;
  }

  /** Lines waiting to be sent (for tests and diagnostics). */
  get buffered(): number {
    return this.#buffer.length;
  }

  #accept(line: string): void {
    let parsed: { level?: unknown; time?: unknown; req?: { id?: unknown } };
    try {
      parsed = JSON.parse(line) as typeof parsed;
    } catch {
      return; // pino only writes JSON; anything else is not ours to forward
    }
    const ms = typeof parsed.time === 'string' ? Date.parse(parsed.time) : Number(parsed.time);
    const requestId = parsed.req?.id;
    this.#buffer.push({
      level: LEVEL_NAMES[Number(parsed.level)] ?? 'info',
      ts: `${Number.isFinite(ms) ? ms : Date.now()}000000`,
      line,
      ...(typeof requestId === 'string' && { requestId }),
    });
    this.#trim();
  }

  // Oldest first, so the newest lines (closest to whatever went wrong) survive.
  #trim(): void {
    const excess = this.#buffer.length - this.#maxBuffered;
    if (excess > 0) {
      this.#buffer.splice(0, excess);
      this.#dropped += excess;
    }
  }

  async #drain(): Promise<void> {
    while (this.#buffer.length > 0) {
      const batch = this.#buffer.splice(0, this.#maxBatch);
      const result = await this.#send(batch);
      if (result === 'retry') {
        this.#buffer.unshift(...batch);
        this.#trim();
        return; // try again on the next tick
      }
    }
  }

  async #send(batch: IEntry[]): Promise<'sent' | 'rejected' | 'retry'> {
    let response: Response;
    try {
      response = await this.#fetch(this.#pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streams: this.#toStreams(batch) }),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (err) {
      this.#markUnreachable(err instanceof Error ? err.message : String(err));
      return 'retry';
    }

    // Starting up (503), overloaded (429) or failing (5xx): the lines are fine, try later.
    if (response.status === 429 || response.status >= 500) {
      this.#markUnreachable(`HTTP ${response.status}`);
      return 'retry';
    }

    this.#markReachable();
    if (!response.ok) {
      // Loki refused these lines themselves (too old, too long…); resending won't help.
      const body = (await response.text().catch(() => '')).slice(0, 300);
      this.#warn(`Loki rejected ${batch.length} log lines (HTTP ${response.status}): ${body}`);
      return 'rejected';
    }
    return 'sent';
  }

  #toStreams(batch: IEntry[]) {
    const byLevel = new Map<string, LokiValue[]>();
    for (const entry of batch) {
      const values = byLevel.get(entry.level) ?? [];
      // The request id goes in as structured metadata: searchable without being a label.
      values.push(
        entry.requestId
          ? [entry.ts, entry.line, { request_id: entry.requestId }]
          : [entry.ts, entry.line],
      );
      byLevel.set(entry.level, values);
    }
    return [...byLevel].map(([level, values]) => ({
      stream: { ...this.#labels, level },
      values,
    }));
  }

  #markUnreachable(reason: string): void {
    if (this.#unreachable) return;
    this.#unreachable = true;
    this.#warn(
      `Can't send logs to Loki (${reason}); keeping up to ${this.#maxBuffered} lines and retrying`,
    );
  }

  #markReachable(): void {
    if (!this.#unreachable) return;
    this.#unreachable = false;
    const lost = this.#dropped;
    this.#dropped = 0;
    this.#warn(
      lost > 0
        ? `Sending logs to Loki again; ${lost} lines were dropped while it was unreachable`
        : 'Sending logs to Loki again; nothing was lost',
    );
  }
}
