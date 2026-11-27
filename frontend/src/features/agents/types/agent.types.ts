export type AgentOs = 'windows' | 'linux-deb' | 'linux-rpm';

export type AgentArch = 'x86_64' | 'arm64';

export type AgentStatus = 'active' | 'disconnected' | 'pending' | 'never_connected';

export interface IAgent {
  wazuhId: string;
  name: string;
  ip: string | null;
  status: AgentStatus;
  os: { name: string | null; platform: string | null; version: string | null };
  version: string | null;
  groups: string[];
  registeredAt: string | null;
  lastKeepAliveAt: string | null;
}

export interface IEnrollCommandRequest {
  os: AgentOs;
  arch?: AgentArch;
  group: string;
  agentName?: string;
}

export interface IEnrollCommand {
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
  generatedAt: string;
}

export interface IEnrollmentCheck {
  found: boolean;
  agent: IAgent | null;
}

export interface IEnrollmentLinkRequest {
  os: AgentOs;
  arch?: AgentArch;
  group: string;
  agentName: string;
}

// Returned once, when a link is created or reissued: the URL is the only copy of its token.
export interface ICreatedEnrollmentLink {
  id: string;
  url: string;
  expiresAt: string;
  name: string;
  group: string;
  os: AgentOs;
  arch: AgentArch | null;
  wazuhAgentId: string;
  agentVersion: string;
}

export interface IEnrollmentLink {
  id: string;
  name: string;
  group: string;
  os: AgentOs;
  arch: AgentArch | null;
  wazuhAgentId: string;
  status: 'pending' | 'connected' | 'expired';
  createdAt: string;
  expiresAt: string;
  scriptDownloadedAt: string | null;
}
