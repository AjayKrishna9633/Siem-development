import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IClock } from '../../interfaces/services/clock.interface.ts';
import type { ILogger } from '../../interfaces/services/logger.interface.ts';
import type { IPendingAgentRepository } from '../../interfaces/repositories/pending-agent.repository.interface.ts';
import type { ISyncPendingAgentsUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { ISyncResult } from '../../types/use-case/agent.types.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import type { ISyncCandidate } from '../../../domain/types/pending-agent.types.ts';
import { AgentStatus } from '../../../domain/enums/AgentStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { SYSTEM_ACTOR } from '../../../domain/constants/audit.ts';

// "Disconnected" is only possible after an agent has connected; a keepalive proves it too.
const hasConnected = (agent: IAgent): boolean =>
  agent.status === AgentStatus.ACTIVE ||
  agent.status === AgentStatus.DISCONNECTED ||
  agent.lastKeepAliveAt !== null;

// Removing agents is the slow, risky part of a tick: a few per tick keeps each tick short and a
// Wazuh hiccup small. The rest wait for the next tick.
export const MAX_REMOVALS_PER_TICK = 2;

const emptyResult = (): ISyncResult => ({
  checked: 0,
  connected: 0,
  expired: 0,
  removalFailed: 0,
  deferred: 0,
  skipped: 0,
  managerUnavailable: false,
});

// One pass over pending_agents: nothing else in Wazuh or SIEMple is looked at or changed.
@injectable()
export class SyncPendingAgentsUseCase implements ISyncPendingAgentsUseCase {
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.AgentManager) private readonly _manager: IAgentManager,
    @inject(TYPES.PendingAgentRepository) private readonly _pending: IPendingAgentRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
    @inject(TYPES.Clock) private readonly _clock: IClock,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'pending-agent-sync' });
  }

  async execute(): Promise<ISyncResult> {
    const result = emptyResult();
    const candidates = await this._pending.listSyncCandidates();
    if (candidates.length === 0) return result;
    result.checked = candidates.length;

    let reported: Map<string, IAgent>;
    try {
      const agents = await this._manager.getAgentsById(candidates.map((c) => c.wazuhAgentId));
      reported = new Map(agents.map((agent) => [agent.wazuhId, agent]));
    } catch (err) {
      if (!(err instanceof AppError) || err.code !== AppErrorCode.AGENT_MANAGER_UNAVAILABLE) {
        throw err;
      }
      // Without Wazuh's answer nothing is decided, and above all nothing is expired.
      this._logger.warn('Wazuh is unreachable; pending agents will be checked again', {
        pending: candidates.length,
      });
      return { ...result, managerUnavailable: true };
    }

    const now = this._clock.now();
    const removals = { attempted: 0 };
    for (const candidate of candidates) {
      const agent = reported.get(candidate.wazuhAgentId);
      if (agent && hasConnected(agent)) {
        await this.connect(candidate, agent, now, result);
      } else if (candidate.expiresAt <= now) {
        if (removals.attempted >= MAX_REMOVALS_PER_TICK) result.deferred++;
        else await this.expire(candidate, now, result, removals);
      }
    }
    return result;
  }

  private async connect(
    candidate: ISyncCandidate,
    agent: IAgent,
    now: Date,
    result: ISyncResult,
  ): Promise<void> {
    const outcome = await this._pending.markConnected(
      candidate.id,
      now,
      this._audit.prepare({
        action: AuditAction.AGENT_ENROLLMENT_LINK_CONNECTED,
        actor: SYSTEM_ACTOR,
        targetType: AuditTargetType.AGENT,
        targetId: candidate.wazuhAgentId,
        targetLabel: candidate.name,
        metadata: {
          os: candidate.os,
          group: candidate.groupName,
          wazuhAgentId: candidate.wazuhAgentId,
          wazuhStatus: agent.status,
        },
      }),
    );
    if (outcome === 'applied') result.connected++;
    else result.skipped++;
  }

  private async expire(
    candidate: ISyncCandidate,
    now: Date,
    result: ISyncResult,
    removals: { attempted: number },
  ): Promise<void> {
    try {
      const outcome = await this._pending.markExpired(
        candidate.id,
        now,
        // Counted only when Wazuh is actually asked: a row a revoke holds costs nothing.
        () => {
          removals.attempted++;
          return this._manager.removeAgent(candidate.wazuhAgentId);
        },
        this._audit.prepare({
          action: AuditAction.AGENT_ENROLLMENT_LINK_EXPIRED,
          actor: SYSTEM_ACTOR,
          targetType: AuditTargetType.AGENT,
          targetId: candidate.wazuhAgentId,
          targetLabel: candidate.name,
          metadata: {
            os: candidate.os,
            group: candidate.groupName,
            wazuhAgentId: candidate.wazuhAgentId,
            expiredAt: candidate.expiresAt.toISOString(),
          },
        }),
      );
      if (outcome === 'applied') result.expired++;
      else result.skipped++;
    } catch (err) {
      // Still registered in Wazuh, so it stays pending and is tried again next tick.
      result.removalFailed++;
      this._logger.warn('Could not remove an expired pending agent from Wazuh; will retry', {
        wazuhAgentId: candidate.wazuhAgentId,
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
}
