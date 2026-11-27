import { randomUUID } from 'node:crypto';
import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { ISecretCipher } from '../../interfaces/services/secret-cipher.service.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { ILogger } from '../../interfaces/services/logger.interface.ts';
import type { IPendingAgentRepository } from '../../interfaces/repositories/pending-agent.repository.interface.ts';
import type { ICreateEnrollmentLinkUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { ICreateEnrollmentLinkInput } from '../../dtos/agent/request/agent-request.dto.ts';
import type {
  ICreatedEnrollmentLink,
  IEnrollmentLinkConfig,
} from '../../types/use-case/agent.types.ts';
import type { IPendingAgent } from '../../../domain/types/pending-agent.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AgentArch, AgentOs } from '../../../domain/enums/AgentOs.ts';
import { PendingAgentStatus } from '../../../domain/enums/PendingAgentStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import {
  isAgentIdentifier,
  resolveAgentVersion,
} from '../../../domain/policies/agent-identifier.policy.ts';
import {
  agentKeyAad,
  enrollmentLinkExpiry,
  enrollmentLinkUrl,
} from '../../../domain/policies/enrollment-link.policy.ts';
import { assertPermission } from '../shared/access.ts';
import { assertEnrollmentLinksConfigured } from './enrollment-link.support.ts';

@injectable()
export class CreateEnrollmentLinkUseCase implements ICreateEnrollmentLinkUseCase {
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.AgentManager) private readonly _manager: IAgentManager,
    @inject(TYPES.PendingAgentRepository) private readonly _pending: IPendingAgentRepository,
    @inject(TYPES.EnrollKeyCipher) private readonly _cipher: ISecretCipher,
    @inject(TYPES.OpaqueTokenService) private readonly _tokens: IOpaqueTokenService,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
    @inject(TYPES.EnrollmentLinkConfig) private readonly _config: IEnrollmentLinkConfig,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'enrollment-links' });
  }

  async execute(input: ICreateEnrollmentLinkInput): Promise<ICreatedEnrollmentLink> {
    assertPermission(input.actor, Permission.AGENTS_MANAGE);

    const { publicUrl } = assertEnrollmentLinksConfigured(this._config, this._cipher);
    if (!isAgentIdentifier(input.group)) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AGENT_GROUP_INVALID);
    }
    if (!isAgentIdentifier(input.agentName)) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AGENT_NAME_INVALID);
    }

    const [groups, managerVersion] = await Promise.all([
      this._manager.listGroups(),
      this._manager.getManagerVersion(),
    ]);
    // Resolved now, so the enrollment service never has to ask Wazuh.
    const agentVersion = resolveAgentVersion(managerVersion, this._config.fallbackAgentVersion);
    if (!groups.includes(input.group)) {
      throw new AppError(AppErrorCode.AGENT_GROUP_NOT_FOUND, ErrorMessage.AGENT_GROUP_NOT_FOUND);
    }
    if (await this._pending.hasPendingName(input.agentName)) {
      throw new AppError(AppErrorCode.AGENT_NAME_TAKEN, ErrorMessage.AGENT_NAME_PENDING);
    }

    // Wazuh is the final word on names: it refuses one that any agent already has.
    const registered = await this._manager.registerAgent(input.agentName);
    try {
      await this._manager.assignGroup(registered.wazuhId, input.group);

      const id = randomUUID();
      const now = new Date();
      const expiresAt = enrollmentLinkExpiry(now);
      const arch = input.os === AgentOs.WINDOWS ? null : (input.arch ?? AgentArch.X86_64);
      const { token, hash } = this._tokens.generate();
      const agent: IPendingAgent = {
        id,
        name: input.agentName,
        groupName: input.group,
        os: input.os,
        arch,
        wazuhAgentId: registered.wazuhId,
        agentVersion,
        agentKey: this._cipher.encrypt(registered.key, agentKeyAad(id)),
        status: PendingAgentStatus.PENDING,
        connectedAt: null,
        createdAt: now,
      };

      await this._pending.createWithLink(
        agent,
        { tokenHash: hash, expiresAt },
        this._audit.prepare({
          action: AuditAction.AGENT_ENROLLMENT_LINK_CREATED,
          targetType: AuditTargetType.AGENT,
          targetId: registered.wazuhId,
          targetLabel: input.agentName,
          metadata: {
            os: input.os,
            arch,
            group: input.group,
            wazuhAgentId: registered.wazuhId,
            agentVersion,
            expiresAt: expiresAt.toISOString(),
          },
        }),
      );

      return {
        id,
        url: enrollmentLinkUrl(publicUrl, token),
        expiresAt,
        name: input.agentName,
        group: input.group,
        os: input.os,
        arch,
        wazuhAgentId: registered.wazuhId,
        agentVersion,
      };
    } catch (err) {
      await this.rollBack(registered.wazuhId);
      throw err;
    }
  }

  // Nothing points at the agent unless the whole link was saved, so take it out of Wazuh again.
  private async rollBack(wazuhId: string): Promise<void> {
    try {
      await this._manager.removeAgent(wazuhId);
    } catch (err) {
      this._logger.error('Could not remove a half-registered agent from Wazuh; remove it by hand', {
        wazuhId,
        err,
      });
    }
  }
}
