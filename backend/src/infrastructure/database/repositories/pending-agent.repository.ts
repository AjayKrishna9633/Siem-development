import { injectable, inject } from 'inversify';
import type { DataSource } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type {
  IPendingAgentRepository,
  RevokeOutcome,
} from '../../../application/interfaces/repositories/pending-agent.repository.interface.ts';
import type { IAuditRecord } from '../../../application/interfaces/repositories/audit-log.repository.interface.ts';
import type {
  IEnrollmentLinkSummary,
  IEnrollmentToken,
  IPendingAgent,
} from '../../../domain/types/pending-agent.types.ts';
import { PendingAgentStatus } from '../../../domain/enums/PendingAgentStatus.ts';
import { PendingAgentModel } from '../models/pending-agent.model.ts';
import { EnrollmentTokenModel } from '../models/enrollment-token.model.ts';
import { insertAuditRecord } from './audit-log.repository.ts';

const toPendingAgent = (row: PendingAgentModel): IPendingAgent => ({
  id: row.id,
  name: row.name,
  groupName: row.groupName,
  os: row.os,
  arch: row.arch,
  wazuhAgentId: row.wazuhAgentId,
  agentKey: {
    ciphertext: row.agentKeyCiphertext,
    iv: row.agentKeyIv,
    authTag: row.agentKeyAuthTag,
    keyVersion: row.keyVersion,
  },
  status: row.status,
  connectedAt: row.connectedAt,
  createdAt: row.createdAt,
});

@injectable()
export class TypeOrmPendingAgentRepository implements IPendingAgentRepository {
  constructor(@inject(TYPES.DataSource) private readonly _db: DataSource) {}

  async hasPendingName(name: string): Promise<boolean> {
    return this._db
      .getRepository(PendingAgentModel)
      .exists({ where: { name, status: PendingAgentStatus.PENDING } });
  }

  async createWithLink(
    agent: IPendingAgent,
    token: IEnrollmentToken,
    audit: IAuditRecord,
  ): Promise<void> {
    await this._db.transaction(async (manager) => {
      await manager.getRepository(PendingAgentModel).insert({
        id: agent.id,
        name: agent.name,
        groupName: agent.groupName,
        os: agent.os,
        arch: agent.arch,
        wazuhAgentId: agent.wazuhAgentId,
        agentKeyCiphertext: agent.agentKey.ciphertext,
        agentKeyIv: agent.agentKey.iv,
        agentKeyAuthTag: agent.agentKey.authTag,
        keyVersion: agent.agentKey.keyVersion,
        status: agent.status,
      });
      await manager.getRepository(EnrollmentTokenModel).insert({
        pendingAgentId: agent.id,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      });
      await insertAuditRecord(manager, audit);
    });
  }

  async listPending(): Promise<IEnrollmentLinkSummary[]> {
    const rows = await this._db
      .getRepository(PendingAgentModel)
      .createQueryBuilder('agent')
      .innerJoin(EnrollmentTokenModel, 'token', 'token.pending_agent_id = agent.id')
      .select([
        'agent.id AS id',
        'agent.name AS name',
        'agent.group_name AS group_name',
        'agent.os AS os',
        'agent.arch AS arch',
        'agent.wazuh_agent_id AS wazuh_agent_id',
        'agent.status AS status',
        'agent.created_at AS created_at',
        'token.expires_at AS expires_at',
        'token.used_at AS used_at',
      ])
      .where('agent.status = :status', { status: PendingAgentStatus.PENDING })
      .orderBy('agent.created_at', 'DESC')
      .getRawMany<{
        id: string;
        name: string;
        group_name: string;
        os: IPendingAgent['os'];
        arch: IPendingAgent['arch'];
        wazuh_agent_id: string;
        status: PendingAgentStatus;
        created_at: Date;
        expires_at: Date;
        used_at: Date | null;
      }>();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      groupName: row.group_name,
      os: row.os,
      arch: row.arch,
      wazuhAgentId: row.wazuh_agent_id,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      scriptDownloadedAt: row.used_at,
    }));
  }

  async revokePending(
    id: string,
    removeFromManager: (agent: IPendingAgent) => Promise<void>,
    audit: (agent: IPendingAgent) => IAuditRecord,
  ): Promise<RevokeOutcome> {
    return this._db.transaction(async (manager) => {
      const row = await manager
        .getRepository(PendingAgentModel)
        .createQueryBuilder('agent')
        .setLock('pessimistic_write')
        .where('agent.id = :id', { id })
        .getOne();
      if (!row) return 'not_found';
      if (row.status !== PendingAgentStatus.PENDING) return 'not_pending';

      const agent = toPendingAgent(row);
      await removeFromManager(agent);
      // The link goes with it (ON DELETE CASCADE).
      await manager.getRepository(PendingAgentModel).delete({ id });
      await insertAuditRecord(manager, audit(agent));
      return 'revoked';
    });
  }
}
