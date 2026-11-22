import type {
  ICheckEnrollmentInput,
  IGenerateEnrollCommandInput,
  IListAgentGroupsInput,
} from '../../dtos/agent/request/agent-request.dto.ts';
import type {
  IEnrollCommandResult,
  IEnrollmentCheckResult,
} from '../../types/use-case/agent.types.ts';

export interface IListAgentGroupsUseCase {
  execute(input: IListAgentGroupsInput): Promise<string[]>;
}

export interface IGenerateEnrollCommandUseCase {
  execute(input: IGenerateEnrollCommandInput): Promise<IEnrollCommandResult>;
}

export interface ICheckEnrollmentUseCase {
  execute(input: ICheckEnrollmentInput): Promise<IEnrollmentCheckResult>;
}
