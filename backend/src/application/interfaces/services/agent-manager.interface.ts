import type { IAgent } from '../../../domain/types/agent.types.ts';

export interface IAgentQuery {
  name?: string;
  // Newest first, registered at or after this moment.
  registeredSince?: Date;
  limit?: number;
}

// The Wazuh manager, behind a port so tests bind a fake. Implementations throw
// AppError(AGENT_MANAGER_UNAVAILABLE) when the manager can't be reached.
export interface IAgentManager {
  listGroups(): Promise<string[]>;
  listAgents(query?: IAgentQuery): Promise<IAgent[]>;
  getManagerVersion(): Promise<string | null>;
}
