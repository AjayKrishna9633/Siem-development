import type { IAgent } from '../../../domain/types/agent.types.ts';

export interface IAgentQuery {
  name?: string;
  // Newest first, registered at or after this moment.
  registeredSince?: Date;
  limit?: number;
}

export interface IRegisteredAgent {
  wazuhId: string;
  // The agent's client key, as Wazuh returns it. Secret: encrypt it before storing it.
  key: string;
}

// The Wazuh manager, behind a port so tests bind a fake. Implementations throw
// AppError(AGENT_MANAGER_UNAVAILABLE) when the manager can't be reached.
export interface IAgentManager {
  listGroups(): Promise<string[]>;
  listAgents(query?: IAgentQuery): Promise<IAgent[]>;
  getManagerVersion(): Promise<string | null>;
  // Throws AppError(AGENT_NAME_TAKEN) when Wazuh already has an agent with that name.
  registerAgent(name: string): Promise<IRegisteredAgent>;
  // Makes the group the agent's only group. Throws AppError(AGENT_GROUP_NOT_FOUND).
  assignGroup(wazuhId: string, group: string): Promise<void>;
  // Succeeds when the agent is already gone, so it is safe to retry.
  removeAgent(wazuhId: string): Promise<void>;
  // The given agents in as few calls as possible; ids Wazuh doesn't know are simply left out.
  getAgentsById(wazuhIds: string[]): Promise<IAgent[]>;
}
