import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

export interface IRetryOptions {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const connectWithRetry = async (
  connect: () => Promise<unknown>,
  logger: ILogger,
  {
    attempts = 12,
    initialDelayMs = 1_000,
    maxDelayMs = 15_000,
    sleep = defaultSleep,
  }: IRetryOptions = {},
): Promise<void> => {
  for (let attempt = 1; ; attempt++) {
    try {
      await connect();
      return;
    } catch (err) {
      if (attempt >= attempts) throw err;
      const delayMs = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
      logger.warn('Database not reachable yet, retrying', {
        attempt,
        of: attempts,
        retryInMs: delayMs,
        reason: err instanceof Error ? err.message : String(err),
      });
      await sleep(delayMs);
    }
  }
};
