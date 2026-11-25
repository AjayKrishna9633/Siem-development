import type { IAgent } from '../../../../domain/types/agent.types.ts';
import type {
  IEnrollCommandResult,
  IEnrollmentCheckResult,
} from '../../../types/use-case/agent.types.ts';
import { iso, isoOrNull } from '../../dates.ts';

export interface IAgentDto {
  wazuhId: string;
  name: string;
  ip: string | null;
  status: string;
  os: { name: string | null; platform: string | null; version: string | null };
  version: string | null;
  groups: string[];
  registeredAt: string | null;
  lastKeepAliveAt: string | null;
}

export interface IEnrollCommandDto extends Omit<IEnrollCommandResult, 'generatedAt'> {
  generatedAt: string;
}

export interface IEnrollmentCheckDto {
  found: boolean;
  agent: IAgentDto | null;
}

export const toAgentDto = (agent: IAgent): IAgentDto => ({
  wazuhId: agent.wazuhId,
  name: agent.name,
  ip: agent.ip,
  status: agent.status,
  os: { name: agent.osName, platform: agent.osPlatform, version: agent.osVersion },
  version: agent.version,
  groups: agent.groups,
  registeredAt: isoOrNull(agent.registeredAt),
  lastKeepAliveAt: isoOrNull(agent.lastKeepAliveAt),
});

export const toEnrollCommandDto = (result: IEnrollCommandResult): IEnrollCommandDto => ({
  ...result,
  generatedAt: iso(result.generatedAt),
});

export const toEnrollmentCheckDto = (result: IEnrollmentCheckResult): IEnrollmentCheckDto => ({
  found: result.found,
  agent: result.agent ? toAgentDto(result.agent) : null,
});
