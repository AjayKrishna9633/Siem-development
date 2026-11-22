import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IListAgentsUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { IListAgentsInput } from '../../dtos/agent/request/agent-request.dto.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { assertPermission } from '../shared/access.ts';

// TODO: read from the agents table once a sync job keeps it up to date; live for now.
@injectable()
export class ListAgentsUseCase implements IListAgentsUseCase {
  constructor(@inject(TYPES.AgentManager) private readonly _manager: IAgentManager) {}

  async execute(input: IListAgentsInput): Promise<IAgent[]> {
    assertPermission(input.actor, Permission.AGENTS_VIEW);
    return this._manager.listAgents();
  }
}
