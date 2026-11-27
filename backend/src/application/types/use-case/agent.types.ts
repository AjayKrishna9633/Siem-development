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

export interface IEnrollmentLinkConfig {
  // Where agents reach the enrollment service, e.g. https://192.168.1.20:8443.
  publicUrl: string | undefined;
  // Where the installed agent reaches the manager (WAZUH_PUBLIC_ADDRESS).
  managerAddress: string | undefined;
  fallbackAgentVersion: string;
}

// Returned once, when the link is made: the URL holds the only copy of the token.
export interface ICreatedEnrollmentLink {
  id: string;
  url: string;
  expiresAt: Date;
  name: string;
  group: string;
  os: AgentOs;
  arch: AgentArch | null;
  wazuhAgentId: string;
  agentVersion: string;
}
