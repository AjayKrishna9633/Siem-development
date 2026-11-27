import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { ICacheService } from '../../application/interfaces/services/cache.service.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';
import type { ISyncPendingAgentsUseCase } from '../../application/interfaces/use-cases/agents.interface.ts';
import type { ISyncResult } from '../../application/types/use-case/agent.types.ts';

export const SYNC_INTERVAL_MS = 15_000;
export const SYNC_LOCK_KEY = 'lock:pending-agent-sync';
// Just under the interval: one tick per 15 s across all API replicas, and a crashed replica's
// lock frees itself. A tick that runs longer is still safe, because every change re-checks its
// row under FOR UPDATE SKIP LOCKED.
export const SYNC_LOCK_TTL_SECONDS = 14;

// Runs inside the API process. The tick itself returns at once when no agent is pending, so
// Wazuh is only asked while there is something to ask about.
@injectable()
export class PendingAgentSyncJob {
  private _timer: NodeJS.Timeout | null = null;
  private _running = false;
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.SyncPendingAgentsUseCase) private readonly _sync: ISyncPendingAgentsUseCase,
    @inject(TYPES.CacheService) private readonly _cache: ICacheService,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'pending-agent-sync' });
  }

  start(intervalMs = SYNC_INTERVAL_MS): void {
    if (this._timer) return;
    this._timer = setInterval(() => void this.tick(), intervalMs);
    this._timer.unref();
  }

  stop(): void {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  // Returns null when this tick didn't run: another tick in this process is still going, or
  // another replica holds the lock.
  async tick(): Promise<ISyncResult | null> {
    if (this._running) return null;
    this._running = true;
    try {
      const claimed = await this._cache.setIfAbsent(
        SYNC_LOCK_KEY,
        Date.now(),
        SYNC_LOCK_TTL_SECONDS,
      );
      if (!claimed) return null;
      const result = await this._sync.execute();
      if (result.connected || result.expired || result.removalFailed || result.deferred) {
        this._logger.info('Pending agents synced', { ...result });
      }
      return result;
    } catch (err) {
      this._logger.error('Pending agent sync failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      return null;
    } finally {
      this._running = false;
    }
  }
}
