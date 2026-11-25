import type {
  IAgentManager,
  IAgentQuery,
} from '../../src/application/interfaces/services/agent-manager.interface.ts';
import type { IAgent } from '../../src/domain/types/agent.types.ts';
import { AgentStatus } from '../../src/domain/enums/AgentStatus.ts';
import { AppError } from '../../src/domain/errors/AppError.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../src/domain/enums/ErrorMessage.ts';

export const ENROLLMENT_PASSWORD = 'Fake-Enrollment_pass.2026:xyz';

export const makeAgent = (overrides: Partial<IAgent> = {}): IAgent => ({
  wazuhId: '001',
  name: 'web-01',
  ip: '192.168.1.50',
  status: AgentStatus.ACTIVE,
  osName: 'Microsoft Windows 11 Pro',
  osPlatform: 'windows',
  osVersion: '10.0.26200',
  version: 'v4.14.10',
  groups: ['default'],
  registeredAt: new Date(),
  lastKeepAliveAt: new Date(),
  ...overrides,
});

// Stands in for the Wazuh manager so no test ever needs a real one.
export class FakeAgentManager implements IAgentManager {
  groups = ['default', 'windows-servers'];
  agents: IAgent[] = [];
  version: string | null = 'v4.14.10';
  down = false;
  calls: { method: string; query?: IAgentQuery }[] = [];

  reset(): void {
    this.groups = ['default', 'windows-servers'];
    this.agents = [];
    this.version = 'v4.14.10';
    this.down = false;
    this.calls = [];
  }

  async listGroups(): Promise<string[]> {
    this.calls.push({ method: 'listGroups' });
    this.failIfDown();
    return this.groups;
  }

  async listAgents(query: IAgentQuery = {}): Promise<IAgent[]> {
    this.calls.push({ method: 'listAgents', query });
    this.failIfDown();
    const since = query.registeredSince;
    return this.agents
      .filter((a) => query.name === undefined || a.name === query.name)
      .filter((a) => !since || (a.registeredAt !== null && a.registeredAt >= since))
      .sort((a, b) => (b.registeredAt?.getTime() ?? 0) - (a.registeredAt?.getTime() ?? 0))
      .slice(0, query.limit ?? 500);
  }

  async getManagerVersion(): Promise<string | null> {
    this.calls.push({ method: 'getManagerVersion' });
    this.failIfDown();
    return this.version;
  }

  private failIfDown(): void {
    if (this.down) {
      throw new AppError(
        AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
        ErrorMessage.AGENT_MANAGER_UNAVAILABLE,
      );
    }
  }
}
