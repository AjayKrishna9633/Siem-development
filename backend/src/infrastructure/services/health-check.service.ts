import type { IRedisClient } from '../../application/interfaces/infrastructure/redis/redis-client.interface.ts';
import type {
  IHealthCheckService,
  IHealthStatus,
} from '../../application/interfaces/services/health-check.service.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

// A dependency that hangs (a dropped connection, a full pool) must not hang the health check:
// Docker would wait for its own timeout and learn nothing more.
export const PROBE_TIMEOUT_MS = 2_000;

const probe = async (run: () => Promise<unknown>, timeoutMs: number): Promise<boolean> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out')), timeoutMs);
  });
  try {
    await Promise.race([run(), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

export interface IHealthCheckOptions {
  pingDatabase: () => Promise<unknown>;
  redis: Pick<IRedisClient, 'ping'>;
  // In production Redis is part of the install, and losing it loses every session on the next
  // restart, so it counts. In development the in-memory cache stands in for it.
  redisRequired: boolean;
  logger: ILogger;
  timeoutMs?: number;
}

// Built by hand in the DI file rather than by Inversify: two of its inputs are a function and
// a flag, which have no injection token.
export class HealthCheckService implements IHealthCheckService {
  private readonly _logger: ILogger;
  private _lastHealthy: boolean | null = null;

  constructor(private readonly _options: IHealthCheckOptions) {
    this._logger = _options.logger.child({ module: 'health' });
  }

  async check(): Promise<IHealthStatus> {
    const { pingDatabase, redis, redisRequired, timeoutMs = PROBE_TIMEOUT_MS } = this._options;
    const [database, redisUp] = await Promise.all([
      probe(pingDatabase, timeoutMs),
      probe(() => redis.ping(), timeoutMs),
    ]);
    const healthy = database && (redisUp || !redisRequired);

    // Logged on change only: Docker asks every few seconds.
    if (healthy !== this._lastHealthy) {
      if (healthy) this._logger.info('Health check passing', { database, redis: redisUp });
      else this._logger.warn('Health check failing', { database, redis: redisUp });
      this._lastHealthy = healthy;
    }

    return { healthy, database, redis: redisUp };
  }
}
