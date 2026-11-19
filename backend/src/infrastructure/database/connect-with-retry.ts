import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

export interface IRetryOptions {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Postgres can still be starting when the API or the migrate job starts (a reboot, a slow disk,
// a first run creating the data folder). Compose waits for it to report healthy on `up`, but
// not when the Docker daemon itself restarts the containers after a reboot, and `npm run dev`
// doesn't wait at all, so the app waits too instead of exiting on the first refused connection.
// Startup only: once connected, the pg pool reconnects by itself.
// 1s, 2s, 4s ... capped at 15s: about 2 minutes over 12 attempts.
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
