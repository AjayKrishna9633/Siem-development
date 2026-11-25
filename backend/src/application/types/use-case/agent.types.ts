import type { AgentArch, AgentOs } from '../../../domain/enums/AgentOs.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';

export interface IAgentEnrollmentConfig {
  publicAddress: string | undefined;
  enrollmentPassword: string | undefined;
  fallbackAgentVersion: string;
}

export interface IEnrollCommandResult {
  os: AgentOs;
  arch: AgentArch | null;
  command: string;
  maskedCommand: string;
  managerAddress: string;
  ports: number[];
  agentVersion: string;
  group: string;
  agentName: string | null;
  requirements: string[];
  connectivityCheck: string;
  generatedAt: Date;
}

export interface IEnrollmentCheckResult {
  found: boolean;
  agent?: IAgent;
}
