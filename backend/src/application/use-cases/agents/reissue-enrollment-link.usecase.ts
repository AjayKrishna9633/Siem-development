import { randomUUID } from 'node:crypto';
import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentManager } from '../../interfaces/services/agent-manager.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { ISecretCipher } from '../../interfaces/services/secret-cipher.service.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { IClock } from '../../interfaces/services/clock.interface.ts';
import type { ILogger } from '../../interfaces/services/logger.interface.ts';
import type { IPendingAgentRepository } from '../../interfaces/repositories/pending-agent.repository.interface.ts';
import type { IReissueEnrollmentLinkUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { IRevokeEnrollmentLinkInput } from '../../dtos/agent/request/agent-request.dto.ts';
import type {
  ICreatedEnrollmentLink,
  IEnrollmentLinkConfig,
} from '../../types/use-case/agent.types.ts';
import type { IPendingAgent } from '../../../domain/types/pending-agent.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { PendingAgentStatus } from '../../../domain/enums/PendingAgentStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { resolveAgentVersion } from '../../../domain/policies/agent-identifier.policy.ts';
import {
  agentKeyAad,
  enrollmentLinkExpiry,
  enrollmentLinkUrl,
} from '../../../domain/policies/enrollment-link.policy.ts';
import { assertPermission } from '../shared/access.ts';
import { assertEnrollmentLinksConfigured } from './enrollment-link.support.ts';

// A new link for a pending agent. Which kind is decided under the row lock:
// - script not downloaded yet: the same agent gets a new token and expiry; Wazuh is untouched.
// - script downloaded (its key may be out there) or link expired: the old agent leaves Wazuh,
//   its row goes, and a fresh agent with the same name, group, OS and arch gets a new link.
// Everything in SIEMple happens in one transaction; if any step after the new Wazuh registration
// fails, that registration is removed again, as when creating a link.
@injectable()
export class ReissueEnrollmentLinkUseCase implements IReissueEnrollmentLinkUseCase {
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.AgentManager) private readonly _manager: IAgentManager,
    @inject(TYPES.PendingAgentRepository) private readonly _pending: IPendingAgentRepository,
    @inject(TYPES.EnrollKeyCipher) private readonly _cipher: ISecretCipher,
    @inject(TYPES.OpaqueTokenService) private readonly _tokens: IOpaqueTokenService,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
    @inject(TYPES.EnrollmentLinkConfig) private readonly _config: IEnrollmentLinkConfig,
    @inject(TYPES.Clock) private readonly _clock: IClock,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'enrollment-links' });
  }

  async execute(input: IRevokeEnrollmentLinkInput): Promise<ICreatedEnrollmentLink> {
    assertPermission(input.actor, Permission.AGENTS_MANAGE);
    const { publicUrl } = assertEnrollmentLinksConfigured(this._config, this._cipher);

    // Set once a new agent exists in Wazuh, so any failure after that can take it out again.
    const registered: { wazuhId?: string } = {};
    try {
      const link = await this._pending.lockForReissue(input.id, async (old, tx) => {
        if (old.status === PendingAgentStatus.CONNECTED) {
          throw new AppError(
            AppErrorCode.ENROLLMENT_LINK_NOT_PENDING,
            ErrorMessage.ENROLLMENT_LINK_CONNECTED,
          );
        }
        const now = this._clock.now();
        const expiresAt = enrollmentLinkExpiry(now);
        const { token, hash } = this._tokens.generate();
        const linkFor = (agent: IPendingAgent): ICreatedEnrollmentLink => ({
          id: agent.id,
          url: enrollmentLinkUrl(publicUrl, token),
          expiresAt,
          name: agent.name,
          group: agent.groupName,
          os: agent.os,
          arch: agent.arch,
          wazuhAgentId: agent.wazuhAgentId,
          agentVersion: agent.agentVersion,
        });

        if (old.status === PendingAgentStatus.PENDING && old.scriptDownloadedAt === null) {
          await tx.rotateLink({ tokenHash: hash, expiresAt });
          await tx.audit(
            this._audit.prepare({
              action: AuditAction.AGENT_ENROLLMENT_LINK_REISSUED,
              targetType: AuditTargetType.AGENT,
              targetId: old.wazuhAgentId,
              targetLabel: old.name,
              metadata: {
                kind: 'new_link',
                wazuhAgentId: old.wazuhAgentId,
                expiresAt: expiresAt.toISOString(),
              },
            }),
          );
          return linkFor(old);
        }

        // The old key may have been handed out: its registration must not survive.
        await this._manager.removeAgent(old.wazuhAgentId);
        await tx.remove();

        const managerVersion = await this._manager.getManagerVersion();
        const created = await this._manager.registerAgent(old.name);
        registered.wazuhId = created.wazuhId;
        await this._manager.assignGroup(created.wazuhId, old.groupName);

        const id = randomUUID();
        const agent: IPendingAgent = {
          id,
          name: old.name,
          groupName: old.groupName,
          os: old.os,
          arch: old.arch,
          wazuhAgentId: created.wazuhId,
          agentVersion: resolveAgentVersion(managerVersion, old.agentVersion),
          agentKey: this._cipher.encrypt(created.key, agentKeyAad(id)),
          status: PendingAgentStatus.PENDING,
          connectedAt: null,
          createdAt: now,
        };
        await tx.insertWithLink(agent, { tokenHash: hash, expiresAt });
        await tx.audit(
          this._audit.prepare({
            action: AuditAction.AGENT_ENROLLMENT_LINK_REISSUED,
            targetType: AuditTargetType.AGENT,
            targetId: created.wazuhId,
            targetLabel: old.name,
            metadata: {
              kind: 'new_agent',
              previousWazuhAgentId: old.wazuhAgentId,
              wazuhAgentId: created.wazuhId,
              reason: old.status === PendingAgentStatus.EXPIRED ? 'expired' : 'script_downloaded',
              expiresAt: expiresAt.toISOString(),
            },
          }),
        );
        return linkFor(agent);
      });

      if (link === null) {
        throw new AppError(
          AppErrorCode.ENROLLMENT_LINK_NOT_FOUND,
          ErrorMessage.ENROLLMENT_LINK_NOT_FOUND,
        );
      }
      return link;
    } catch (err) {
      if (registered.wazuhId) await this.rollBack(registered.wazuhId);
      throw err;
    }
  }

  // Nothing in SIEMple points at the new agent, because the transaction rolled back.
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
