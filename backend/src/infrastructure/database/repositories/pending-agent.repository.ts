import { injectable, inject } from 'inversify';
import type { DataSource, EntityManager } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type {
  IPendingAgentRepository,
  IReissueTransaction,
  RevokeOutcome,
  SyncOutcome,
} from '../../../application/interfaces/repositories/pending-agent.repository.interface.ts';
import type { IAuditRecord } from '../../../application/interfaces/repositories/audit-log.repository.interface.ts';
import type {
  ILockedPendingAgent,
  ISyncCandidate,
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
  agentVersion: row.agentVersion,
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

const insertAgentWithLink = async (
  manager: EntityManager,
  agent: IPendingAgent,
  token: IEnrollmentToken,
): Promise<void> => {
  await manager.getRepository(PendingAgentModel).insert({
    id: agent.id,
    name: agent.name,
    groupName: agent.groupName,
    os: agent.os,
    arch: agent.arch,
    wazuhAgentId: agent.wazuhAgentId,
    agentVersion: agent.agentVersion,
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
};

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
      await insertAgentWithLink(manager, agent, token);
      await insertAuditRecord(manager, audit);
    });
  }

  async lockForReissue<T>(
    id: string,
    work: (agent: ILockedPendingAgent, tx: IReissueTransaction) => Promise<T>,
  ): Promise<T | null> {
    return this._db.transaction(async (manager) => {
      const row = await manager
        .getRepository(PendingAgentModel)
        .createQueryBuilder('agent')
        .setLock('pessimistic_write')
        .where('agent.id = :id', { id })
        .getOne();
      if (!row) return null;
      const [token] = await manager.query<{ used_at: Date | null }[]>(
        'SELECT used_at FROM enrollment_tokens WHERE pending_agent_id = $1 FOR UPDATE',
        [id],
      );
      const agent: ILockedPendingAgent = {
        ...toPendingAgent(row),
        scriptDownloadedAt: token?.used_at ?? null,
      };
      return work(agent, {
        rotateLink: async (next) => {
          await manager.query(
            `UPDATE enrollment_tokens SET token_hash = $2, expires_at = $3, used_at = NULL
              WHERE pending_agent_id = $1`,
            [id, next.tokenHash, next.expiresAt],
          );
        },
        // The link goes with it (ON DELETE CASCADE).
        remove: async () => {
          await manager.getRepository(PendingAgentModel).delete({ id });
        },
        insertWithLink: (next, nextToken) => insertAgentWithLink(manager, next, nextToken),
        audit: (record) => insertAuditRecord(manager, record),
      });
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

  async listSyncCandidates(): Promise<ISyncCandidate[]> {
    const rows = await this._db.query<
      {
        id: string;
        name: string;
        group_name: string;
        os: ISyncCandidate['os'];
        wazuh_agent_id: string;
        expires_at: Date;
      }[]
    >(
      `SELECT a.id, a.name, a.group_name, a.os, a.wazuh_agent_id, t.expires_at
         FROM pending_agents a
         JOIN enrollment_tokens t ON t.pending_agent_id = a.id
        WHERE a.status = $1
        ORDER BY a.created_at`,
      [PendingAgentStatus.PENDING],
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      groupName: row.group_name,
      os: row.os,
      wazuhAgentId: row.wazuh_agent_id,
      expiresAt: row.expires_at,
    }));
  }

  async markConnected(id: string, connectedAt: Date, audit: IAuditRecord): Promise<SyncOutcome> {
    return this._db.transaction(async (manager) => {
      const [row] = await manager.query<{ id: string }[]>(
        `SELECT id FROM pending_agents WHERE id = $1 AND status = $2 FOR UPDATE SKIP LOCKED`,
        [id, PendingAgentStatus.PENDING],
      );
      if (!row) return 'skipped';
      await manager.query(
        `UPDATE pending_agents SET status = $2, connected_at = $3, updated_at = now() WHERE id = $1`,
        [id, PendingAgentStatus.CONNECTED, connectedAt],
      );
      await insertAuditRecord(manager, audit);
      return 'applied';
    });
  }

  async markExpired(
    id: string,
    now: Date,
    removeFromManager: () => Promise<void>,
    audit: IAuditRecord,
  ): Promise<SyncOutcome> {
    return this._db.transaction(async (manager) => {
      const [row] = await manager.query<{ id: string }[]>(
        `SELECT a.id FROM pending_agents a
           JOIN enrollment_tokens t ON t.pending_agent_id = a.id
          WHERE a.id = $1 AND a.status = $2 AND t.expires_at <= $3
          FOR UPDATE OF a SKIP LOCKED`,
        [id, PendingAgentStatus.PENDING, now],
      );
      if (!row) return 'skipped';
      // Out of Wazuh first: only then may the agent be marked expired. A throw rolls back.
      await removeFromManager();
      await manager.query(
        `UPDATE pending_agents SET status = $2, updated_at = now() WHERE id = $1`,
        [id, PendingAgentStatus.EXPIRED],
      );
      await insertAuditRecord(manager, audit);
      return 'applied';
    });
  }
}
