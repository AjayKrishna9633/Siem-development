import type {
  ICheckEnrollmentInput,
  ICreateEnrollmentLinkInput,
  IListEnrollmentLinksInput,
  IRevokeEnrollmentLinkInput,
  IGenerateEnrollCommandInput,
  IListAgentGroupsInput,
  IListAgentsInput,
} from '../../dtos/agent/request/agent-request.dto.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import type { IEnrollmentLinkSummary } from '../../../domain/types/pending-agent.types.ts';
import type {
  ISyncResult,
  ICreatedEnrollmentLink,
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

export interface ICreateEnrollmentLinkUseCase {
  execute(input: ICreateEnrollmentLinkInput): Promise<ICreatedEnrollmentLink>;
}

export interface IListEnrollmentLinksUseCase {
  execute(input: IListEnrollmentLinksInput): Promise<IEnrollmentLinkSummary[]>;
}

export interface IRevokeEnrollmentLinkUseCase {
  execute(input: IRevokeEnrollmentLinkInput): Promise<void>;
}

export interface ISyncPendingAgentsUseCase {
  execute(): Promise<ISyncResult>;
}
