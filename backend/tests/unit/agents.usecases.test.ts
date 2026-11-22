import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateEnrollCommandUseCase } from '../../src/application/use-cases/agents/generate-enroll-command.usecase.ts';
import { CheckEnrollmentUseCase } from '../../src/application/use-cases/agents/check-enrollment.usecase.ts';
import { ListAgentGroupsUseCase } from '../../src/application/use-cases/agents/list-agent-groups.usecase.ts';
import type { IAuditService } from '../../src/application/interfaces/services/audit.service.interface.ts';
import type { IAgentRepository } from '../../src/application/interfaces/repositories/agent.repository.interface.ts';
import type { IAgentEnrollmentConfig } from '../../src/application/types/use-case/agent.types.ts';
import type { IActor } from '../../src/application/types/use-case/actor.types.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { AgentArch, AgentOs } from '../../src/domain/enums/AgentOs.ts';
import { AgentStatus } from '../../src/domain/enums/AgentStatus.ts';
import { AuditAction, AuditTargetType } from '../../src/domain/enums/AuditAction.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../src/domain/enums/ErrorMessage.ts';
import { AppError } from '../../src/domain/errors/AppError.ts';
import { ENROLLMENT_PASSWORD, FakeAgentManager, makeAgent } from '../helpers/fake-agent-manager.ts';

const admin: IActor = { userId: 'a1', role: UserRole.ADMIN };
const t1: IActor = { userId: 't1', role: UserRole.T1_ANALYST };
const t2: IActor = { userId: 't2', role: UserRole.T2_ANALYST };

const rejectsWith = async (promise: Promise<unknown>, code: AppErrorCode) => {
  const err = await promise.then(
    () => {
      throw new Error(`expected ${code}`);
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
  return err as AppError;
};

let manager: FakeAgentManager;
let audit: { record: ReturnType<typeof vi.fn>; prepare: ReturnType<typeof vi.fn> };
let config: IAgentEnrollmentConfig;

beforeEach(() => {
  manager = new FakeAgentManager();
  audit = { record: vi.fn().mockResolvedValue(undefined), prepare: vi.fn() };
  config = {
    publicAddress: '192.168.1.20',
    enrollmentPassword: ENROLLMENT_PASSWORD,
    fallbackAgentVersion: '4.14.10',
  };
});

const generate = () =>
  new GenerateEnrollCommandUseCase(manager, audit as unknown as IAuditService, config);

describe('GenerateEnrollCommand', () => {
  it.each([t1, t2])('is forbidden for %o', async (actor) => {
    await rejectsWith(
      generate().execute({ actor, os: AgentOs.WINDOWS, group: 'default' }),
      AppErrorCode.FORBIDDEN,
    );
    expect(manager.calls).toEqual([]);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('returns the command, its masked copy and everything the page shows', async () => {
    const result = await generate().execute({
      actor: admin,
      os: AgentOs.LINUX_DEB,
      group: 'default',
      agentName: 'db-01',
    });

    expect(result.command).toContain(ENROLLMENT_PASSWORD);
    expect(result.maskedCommand).not.toContain(ENROLLMENT_PASSWORD);
    expect(result.maskedCommand).toContain('********');
    expect(result).toMatchObject({
      os: AgentOs.LINUX_DEB,
      arch: AgentArch.X86_64,
      managerAddress: '192.168.1.20',
      ports: [1514, 1515],
      agentVersion: '4.14.10',
      group: 'default',
      agentName: 'db-01',
      connectivityCheck: "nc -zv '192.168.1.20' 1514 && nc -zv '192.168.1.20' 1515",
    });
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('has no architecture on Windows', async () => {
    const result = await generate().execute({
      actor: admin,
      os: AgentOs.WINDOWS,
      arch: AgentArch.ARM64,
      group: 'default',
    });
    expect(result.arch).toBeNull();
    expect(result.agentName).toBeNull();
  });

  it("installs the manager's version, never a newer one", async () => {
    manager.version = 'v4.12.0';
    config.fallbackAgentVersion = '4.14.10';
    const result = await generate().execute({
      actor: admin,
      os: AgentOs.WINDOWS,
      group: 'default',
    });
    expect(result.agentVersion).toBe('4.12.0');
    expect(result.command).toContain('wazuh-agent-4.12.0-1.msi');
  });

  it('falls back to WAZUH_AGENT_VERSION when the manager reports none', async () => {
    manager.version = null;
    const result = await generate().execute({
      actor: admin,
      os: AgentOs.WINDOWS,
      group: 'default',
    });
    expect(result.agentVersion).toBe('4.14.10');
  });

  it('rejects a group Wazuh does not have (400)', async () => {
    await rejectsWith(
      generate().execute({ actor: admin, os: AgentOs.WINDOWS, group: 'no-such-group' }),
      AppErrorCode.AGENT_GROUP_NOT_FOUND,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects an unsafe group or name without calling Wazuh', async () => {
    await rejectsWith(
      generate().execute({ actor: admin, os: AgentOs.WINDOWS, group: 'a;b' }),
      AppErrorCode.VALIDATION_ERROR,
    );
    await rejectsWith(
      generate().execute({
        actor: admin,
        os: AgentOs.WINDOWS,
        group: 'default',
        agentName: '$(id)',
      }),
      AppErrorCode.VALIDATION_ERROR,
    );
    expect(manager.calls).toEqual([]);
  });

  it('rejects a name an active agent already uses (409)', async () => {
    manager.agents = [makeAgent({ name: 'web-01', status: AgentStatus.ACTIVE })];
    await rejectsWith(
      generate().execute({
        actor: admin,
        os: AgentOs.WINDOWS,
        group: 'default',
        agentName: 'web-01',
      }),
      AppErrorCode.AGENT_NAME_TAKEN,
    );
  });

  it('rejects a name registered in the last hour, even if disconnected', async () => {
    manager.agents = [
      makeAgent({
        name: 'web-01',
        status: AgentStatus.DISCONNECTED,
        registeredAt: new Date(Date.now() - 10 * 60_000),
      }),
    ];
    await rejectsWith(
      generate().execute({
        actor: admin,
        os: AgentOs.WINDOWS,
        group: 'default',
        agentName: 'web-01',
      }),
      AppErrorCode.AGENT_NAME_TAKEN,
    );
  });

  it('allows a name whose agent has been disconnected for over an hour (Wazuh replaces it)', async () => {
    manager.agents = [
      makeAgent({
        name: 'web-01',
        status: AgentStatus.DISCONNECTED,
        registeredAt: new Date(Date.now() - 2 * 3_600_000),
      }),
    ];
    const result = await generate().execute({
      actor: admin,
      os: AgentOs.WINDOWS,
      group: 'default',
      agentName: 'web-01',
    });
    expect(result.agentName).toBe('web-01');
  });

  it('answers 409 when WAZUH_PUBLIC_ADDRESS is not set, before calling Wazuh', async () => {
    config.publicAddress = undefined;
    const err = await rejectsWith(
      generate().execute({ actor: admin, os: AgentOs.WINDOWS, group: 'default' }),
      AppErrorCode.AGENT_ENROLLMENT_NOT_CONFIGURED,
    );
    expect(err.message).toBe(ErrorMessage.WAZUH_PUBLIC_ADDRESS_MISSING);
    expect(err.message).toContain('Set WAZUH_PUBLIC_ADDRESS in .env');
    expect(manager.calls).toEqual([]);
  });

  it('answers 409 when WAZUH_ENROLLMENT_PASSWORD is not set', async () => {
    config.enrollmentPassword = undefined;
    const err = await rejectsWith(
      generate().execute({ actor: admin, os: AgentOs.WINDOWS, group: 'default' }),
      AppErrorCode.AGENT_ENROLLMENT_NOT_CONFIGURED,
    );
    expect(err.message).toBe(ErrorMessage.ENROLLMENT_PASSWORD_MISSING);
  });

  it('answers 503 when Wazuh is down, and audits nothing', async () => {
    manager.down = true;
    await rejectsWith(
      generate().execute({ actor: admin, os: AgentOs.WINDOWS, group: 'default' }),
      AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('writes the audit row with os, arch, group and name, and never the password', async () => {
    await generate().execute({
      actor: admin,
      os: AgentOs.LINUX_RPM,
      arch: AgentArch.ARM64,
      group: 'default',
      agentName: 'db-01',
    });

    expect(audit.record).toHaveBeenCalledTimes(1);
    const event = audit.record.mock.calls[0]?.[0];
    expect(event).toEqual({
      action: AuditAction.AGENT_ENROLL_COMMAND_GENERATED,
      targetType: AuditTargetType.AGENT,
      targetLabel: 'db-01',
      metadata: {
        os: AgentOs.LINUX_RPM,
        arch: AgentArch.ARM64,
        group: 'default',
        agentName: 'db-01',
      },
    });
    expect(JSON.stringify(event)).not.toContain(ENROLLMENT_PASSWORD);
  });
});

describe('CheckEnrollment', () => {
  let agents: { upsert: ReturnType<typeof vi.fn> };
  const check = () => new CheckEnrollmentUseCase(manager, agents as unknown as IAgentRepository);

  beforeEach(() => {
    agents = { upsert: vi.fn().mockResolvedValue(undefined) };
  });

  it.each([t1, t2])('is forbidden for %o', async (actor) => {
    await rejectsWith(check().execute({ actor, since: new Date() }), AppErrorCode.FORBIDDEN);
  });

  it('finds the named agent registered after `since` and stores it', async () => {
    const since = new Date(Date.now() - 60_000);
    const fresh = makeAgent({ wazuhId: '007', name: 'web-01', registeredAt: new Date() });
    manager.agents = [fresh];

    const result = await check().execute({ actor: admin, agentName: 'web-01', since });

    expect(result).toEqual({ found: true, agent: fresh });
    expect(agents.upsert).toHaveBeenCalledWith(fresh);
    expect(manager.calls).toContainEqual({
      method: 'listAgents',
      query: expect.objectContaining({ name: 'web-01' }),
    });
  });

  it('ignores an older agent with the same name', async () => {
    manager.agents = [
      makeAgent({ name: 'web-01', registeredAt: new Date(Date.now() - 3_600_000) }),
    ];
    const result = await check().execute({ actor: admin, agentName: 'web-01', since: new Date() });
    expect(result).toEqual({ found: false });
    expect(agents.upsert).not.toHaveBeenCalled();
  });

  it('without a name, returns the newest agent registered after `since`', async () => {
    const since = new Date(Date.now() - 60_000);
    const newest = makeAgent({ wazuhId: '009', name: 'laptop-9', registeredAt: new Date() });
    manager.agents = [
      makeAgent({ wazuhId: '008', name: 'laptop-8', registeredAt: new Date(Date.now() - 30_000) }),
      newest,
    ];
    const result = await check().execute({ actor: admin, since });
    expect(result.agent?.wazuhId).toBe('009');
  });

  it('reports not found while nothing has enrolled', async () => {
    const result = await check().execute({ actor: admin, since: new Date() });
    expect(result).toEqual({ found: false });
  });

  it('answers 503 when Wazuh is down', async () => {
    manager.down = true;
    await rejectsWith(
      check().execute({ actor: admin, since: new Date() }),
      AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
    );
  });
});

describe('ListAgentGroups', () => {
  it.each([t1, t2])('is forbidden for %o', async (actor) => {
    await rejectsWith(
      new ListAgentGroupsUseCase(manager).execute({ actor }),
      AppErrorCode.FORBIDDEN,
    );
  });

  it('returns the groups sorted', async () => {
    manager.groups = ['windows-servers', 'default', 'linux'];
    expect(await new ListAgentGroupsUseCase(manager).execute({ actor: admin })).toEqual([
      'default',
      'linux',
      'windows-servers',
    ]);
  });
});
