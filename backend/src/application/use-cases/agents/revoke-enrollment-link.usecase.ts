import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IPendingAgentRepository } from '../../interfaces/repositories/pending-agent.repository.interface.ts';
import type { IRevokeEnrollmentLinkUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { IRevokeEnrollmentLinkInput } from '../../dtos/agent/request/agent-request.dto.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';

@injectable()
export class RevokeEnrollmentLinkUseCase implements IRevokeEnrollmentLinkUseCase {
  constructor(
    @inject(TYPES.AgentManager) private readonly _manager: IAgentManager,
    @inject(TYPES.PendingAgentRepository) private readonly _pending: IPendingAgentRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  // Removing the agent from Wazuh makes its key useless even if the script was downloaded.
  async execute(input: IRevokeEnrollmentLinkInput): Promise<void> {
    assertPermission(input.actor, Permission.AGENTS_MANAGE);

    const outcome = await this._pending.revokePending(
      input.id,
      (agent) => this._manager.removeAgent(agent.wazuhAgentId),
      (agent) =>
        this._audit.prepare({
          action: AuditAction.AGENT_ENROLLMENT_LINK_REVOKED,
          targetType: AuditTargetType.AGENT,
          targetId: agent.wazuhAgentId,
          targetLabel: agent.name,
          metadata: { os: agent.os, group: agent.groupName, wazuhAgentId: agent.wazuhAgentId },
        }),
    );

    if (outcome === 'not_found') {
      throw new AppError(
        AppErrorCode.ENROLLMENT_LINK_NOT_FOUND,
        ErrorMessage.ENROLLMENT_LINK_NOT_FOUND,
      );
    }
    if (outcome === 'not_pending') {
      throw new AppError(
        AppErrorCode.ENROLLMENT_LINK_NOT_PENDING,
        ErrorMessage.ENROLLMENT_LINK_NOT_PENDING,
      );
    }
  }
}
