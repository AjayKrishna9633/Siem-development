import type { IActor } from '../../../types/use-case/actor.types.ts';
import type { AgentArch, AgentOs } from '../../../../domain/enums/AgentOs.ts';

export interface IListAgentGroupsInput {
  actor: IActor;
}

export interface IGenerateEnrollCommandInput {
  actor: IActor;
  os: AgentOs;
  arch?: AgentArch;
  group: string;
  agentName?: string;
}

export interface ICheckEnrollmentInput {
  actor: IActor;
  agentName?: string;
  since: Date;
}
