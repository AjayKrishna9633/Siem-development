import type { IAgent } from '../../../domain/types/agent.types.ts';

export interface IAgentRepository {
  upsert(agent: IAgent): Promise<void>;
}
