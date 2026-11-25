import type {
  ICheckEnrollmentInput,
  IGenerateEnrollCommandInput,
  IListAgentGroupsInput,
  IListAgentsInput,
} from '../../dtos/agent/request/agent-request.dto.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import type {
  IEnrollCommandResult,
  IEnrollmentCheckResult,
} from '../../types/use-case/agent.types.ts';

export interface IListAgentsUseCase {
  execute(input: IListAgentsInput): Promise<IAgent[]>;
}

export interface IListAgentGroupsUseCase {
  execute(input: IListAgentGroupsInput): Promise<string[]>;
}

export interface IGenerateEnrollCommandUseCase {
  execute(input: IGenerateEnrollCommandInput): Promise<IEnrollCommandResult>;
}

export interface ICheckEnrollmentUseCase {
  execute(input: ICheckEnrollmentInput): Promise<IEnrollmentCheckResult>;
}
