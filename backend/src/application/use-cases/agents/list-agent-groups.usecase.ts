import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IListAgentGroupsUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { IListAgentGroupsInput } from '../../dtos/agent/request/agent-request.dto.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { assertPermission } from '../shared/access.ts';

@injectable()
export class ListAgentGroupsUseCase implements IListAgentGroupsUseCase {
  constructor(@inject(TYPES.AgentManager) private readonly _manager: IAgentManager) {}

  async execute(input: IListAgentGroupsInput): Promise<string[]> {
    assertPermission(input.actor, Permission.AGENTS_MANAGE);
    const groups = await this._manager.listGroups();
    return [...groups].sort((a, b) => a.localeCompare(b));
  }
}
