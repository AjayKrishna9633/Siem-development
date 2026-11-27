import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IGenerateEnrollCommandUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { IGenerateEnrollCommandInput } from '../../dtos/agent/request/agent-request.dto.ts';
import type {
  IAgentEnrollmentConfig,
  IEnrollCommandResult,
} from '../../types/use-case/agent.types.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AgentArch, AgentOs } from '../../../domain/enums/AgentOs.ts';
import { AgentStatus } from '../../../domain/enums/AgentStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { WAZUH_AGENT_PORTS } from '../../../shared/agent-install/wazuh-packages.ts';
import {
  isAgentIdentifier,
  resolveAgentVersion,
} from '../../../domain/policies/agent-identifier.policy.ts';
import {
  buildConnectivityCheck,
  buildEnrollCommand,
  enrollRequirements,
} from '../../../shared/agent-install/enroll-command.ts';
import { assertPermission } from '../shared/access.ts';

// Wazuh's authd replaces an agent that has been disconnected for more than an hour.
const NAME_REUSE_AFTER_MS = 60 * 60_000;

const blocksName = (agent: IAgent, now: Date): boolean =>
  agent.status === AgentStatus.ACTIVE ||
  (agent.registeredAt !== null &&
    now.getTime() - agent.registeredAt.getTime() < NAME_REUSE_AFTER_MS);

@injectable()
export class GenerateEnrollCommandUseCase implements IGenerateEnrollCommandUseCase {
  constructor(
    @inject(TYPES.AgentManager) private readonly _manager: IAgentManager,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
    @inject(TYPES.AgentEnrollmentConfig) private readonly _config: IAgentEnrollmentConfig,
  ) {}

  async execute(input: IGenerateEnrollCommandInput): Promise<IEnrollCommandResult> {
    assertPermission(input.actor, Permission.AGENTS_MANAGE);

    const { publicAddress, enrollmentPassword } = this._config;
    if (!publicAddress) {
      throw new AppError(
        AppErrorCode.AGENT_ENROLLMENT_NOT_CONFIGURED,
        ErrorMessage.WAZUH_PUBLIC_ADDRESS_MISSING,
      );
    }
    if (!enrollmentPassword) {
      throw new AppError(
        AppErrorCode.AGENT_ENROLLMENT_NOT_CONFIGURED,
        ErrorMessage.ENROLLMENT_PASSWORD_MISSING,
      );
    }
    if (!isAgentIdentifier(input.group)) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AGENT_GROUP_INVALID);
    }
    if (input.agentName !== undefined && !isAgentIdentifier(input.agentName)) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AGENT_NAME_INVALID);
    }

    const [groups, managerVersion] = await Promise.all([
      this._manager.listGroups(),
      this._manager.getManagerVersion(),
    ]);
    if (!groups.includes(input.group)) {
      throw new AppError(AppErrorCode.AGENT_GROUP_NOT_FOUND, ErrorMessage.AGENT_GROUP_NOT_FOUND);
    }

    const now = new Date();
    if (input.agentName !== undefined) {
      const sameName = await this._manager.listAgents({ name: input.agentName });
      if (sameName.some((agent) => agent.name === input.agentName && blocksName(agent, now))) {
        throw new AppError(AppErrorCode.AGENT_NAME_TAKEN, ErrorMessage.AGENT_NAME_TAKEN);
      }
    }

    const arch = input.os === AgentOs.WINDOWS ? null : (input.arch ?? AgentArch.X86_64);
    const agentVersion = resolveAgentVersion(managerVersion, this._config.fallbackAgentVersion);
    const { command, maskedCommand } = buildEnrollCommand(input.os, {
      managerAddress: publicAddress,
      enrollmentPassword,
      agentVersion,
      group: input.group,
      ...(input.agentName !== undefined && { agentName: input.agentName }),
      ...(arch !== null && { arch }),
    });

    await this._audit.record({
      action: AuditAction.AGENT_ENROLL_COMMAND_GENERATED,
      targetType: AuditTargetType.AGENT,
      targetLabel: input.agentName ?? null,
      metadata: { os: input.os, arch, group: input.group, agentName: input.agentName ?? null },
    });

    return {
      os: input.os,
      arch,
      command,
      maskedCommand,
      managerAddress: publicAddress,
      ports: [...WAZUH_AGENT_PORTS],
      agentVersion,
      group: input.group,
      agentName: input.agentName ?? null,
      requirements: enrollRequirements(input.os, publicAddress),
      connectivityCheck: buildConnectivityCheck(input.os, publicAddress),
      generatedAt: now,
    };
  }
}
