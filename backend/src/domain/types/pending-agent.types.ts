import type { AgentArch, AgentOs } from '../enums/AgentOs.ts';
import type { PendingAgentStatus } from '../enums/PendingAgentStatus.ts';
import type { IEncryptedSecret } from './email-settings.types.ts';

// An agent registered in Wazuh ahead of time. Its key is encrypted with ENROLL_KEY_SECRET, with
// the pending agent's id as additional data, so a ciphertext can't be moved to another row.
export interface IPendingAgent {
  id: string;
  name: string;
  groupName: string;
  os: AgentOs;
  arch: AgentArch | null;
  wazuhAgentId: string;
  agentVersion: string;
  agentKey: IEncryptedSecret;
  status: PendingAgentStatus;
  connectedAt: Date | null;
  createdAt: Date;
}

export interface IEnrollmentToken {
  tokenHash: string;
  expiresAt: Date;
}

// What the dashboard lists: never the key, the token or its hash.
export interface IEnrollmentLinkSummary {
  id: string;
  name: string;
  groupName: string;
  os: AgentOs;
  arch: AgentArch | null;
  wazuhAgentId: string;
  status: PendingAgentStatus;
  createdAt: Date;
  expiresAt: Date;
  scriptDownloadedAt: Date | null;
}
