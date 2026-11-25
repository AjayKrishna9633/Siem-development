import type { AgentStatus } from '../enums/AgentStatus.ts';

export interface IAgent {
  wazuhId: string;
  name: string;
  ip: string | null;
  status: AgentStatus;
  osName: string | null;
  osPlatform: string | null;
  osVersion: string | null;
  version: string | null;
  groups: string[];
  registeredAt: Date | null;
  lastKeepAliveAt: Date | null;
}
