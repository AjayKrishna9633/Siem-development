import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IAgentRepository } from '../../interfaces/repositories/agent.repository.interface.ts';
import type { ICheckEnrollmentUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { ICheckEnrollmentInput } from '../../dtos/agent/request/agent-request.dto.ts';
import type { IEnrollmentCheckResult } from '../../types/use-case/agent.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { assertPermission } from '../shared/access.ts';

// Tolerates a small clock difference between this server and the Wazuh manager.
const CLOCK_SKEW_MS = 30_000;

@injectable()
export class CheckEnrollmentUseCase implements ICheckEnrollmentUseCase {
  constructor(
    @inject(TYPES.AgentManager) private readonly _manager: IAgentManager,
    @inject(TYPES.AgentRepository) private readonly _agents: IAgentRepository,
  ) {}

  async execute(input: ICheckEnrollmentInput): Promise<IEnrollmentCheckResult> {
    assertPermission(input.actor, Permission.AGENTS_MANAGE);

    const since = new Date(input.since.getTime() - CLOCK_SKEW_MS);
    const candidates = await this._manager.listAgents({
      registeredSince: since,
      ...(input.agentName !== undefined ? { name: input.agentName } : { limit: 1 }),
    });
    const agent = candidates.find(
      (a) =>
        (input.agentName === undefined || a.name === input.agentName) &&
        a.registeredAt !== null &&
        a.registeredAt >= since,
    );
    if (!agent) return { found: false };

    await this._agents.upsert(agent);
    return { found: true, agent };
  }
}
