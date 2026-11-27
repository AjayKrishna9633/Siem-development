import { createHash, timingSafeEqual } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { AgentArch, AgentOs } from '../domain/enums/AgentOs.ts';
import type { IEncryptedSecret } from '../domain/types/email-settings.types.ts';

// Everything the enrollment service reads or writes, as siemple_enroll. Plain SQL naming only the
// columns that role may read: SELECT on enrollment_tokens and on some pending_agents columns,
// UPDATE (used_at) on enrollment_tokens.

export interface IEnrollmentLinkView {
  agentName: string;
  os: AgentOs;
  arch: AgentArch | null;
  status: 'pending' | 'connected';
  scriptDownloaded: boolean;
}

export interface IClaimedAgent {
  pendingAgentId: string;
  agentName: string;
  os: AgentOs;
  arch: AgentArch | null;
  agentVersion: string;
  agentKey: IEncryptedSecret;
}

const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');

// The row was found by its hash, so this only guards against a lookup that matched something
// else; it compares in constant time all the same.
const sameHash = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === 32 && right.length === 32 && timingSafeEqual(left, right);
};

// Unknown, expired and revoked (deleted) links all come back as null, through the same query.
// A pending agent the sync job marked expired counts as expired too.
const LIVE_LINK = `
  FROM enrollment_tokens t
  JOIN pending_agents a ON a.id = t.pending_agent_id
  WHERE t.token_hash = $1 AND t.expires_at > now() AND a.status IN ('pending', 'connected')`;

export class EnrollmentStore {
  constructor(private readonly _db: DataSource) {}

  // Whatever the input, it is hashed and looked up the same way, so a malformed token costs the
  // same as a well-formed unknown one.
  hashToken(token: string): string {
    return sha256Hex(token);
  }

  async findLink(tokenHash: string): Promise<IEnrollmentLinkView | null> {
    const [row] = await this._db.query<
      {
        token_hash: string;
        used_at: Date | null;
        name: string;
        os: AgentOs;
        arch: AgentArch | null;
        status: 'pending' | 'connected';
      }[]
    >(`SELECT t.token_hash, t.used_at, a.name, a.os, a.arch, a.status ${LIVE_LINK}`, [tokenHash]);
    if (!row || !sameHash(row.token_hash, tokenHash)) return null;
    return {
      agentName: row.name,
      os: row.os,
      arch: row.arch,
      status: row.status,
      scriptDownloaded: row.used_at !== null,
    };
  }

  async findStatus(tokenHash: string): Promise<'pending' | 'connected' | null> {
    const link = await this.findLink(tokenHash);
    return link?.status ?? null;
  }

  // Marks the link used and hands the agent to `build`, in one transaction: if build throws (for
  // example the key won't decrypt), the link stays unused. Of several concurrent calls only one
  // gets a row back; the UPDATE's row lock makes the others see used_at already set.
  async claimScript<T>(tokenHash: string, build: (agent: IClaimedAgent) => T): Promise<T | null> {
    return this._db
      .transaction(async (manager) => {
        // For UPDATE ... RETURNING, TypeORM's postgres driver answers [rows, affectedCount].
        const [rows] = await manager.query<
          [{ pending_agent_id: string; token_hash: string }[], number]
        >(
          `UPDATE enrollment_tokens SET used_at = now()
           WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
           RETURNING pending_agent_id, token_hash`,
          [tokenHash],
        );
        const claimed = rows[0];
        if (!claimed || !sameHash(claimed.token_hash, tokenHash)) return null;

        const [agent] = await manager.query<
          {
            id: string;
            name: string;
            os: AgentOs;
            arch: AgentArch | null;
            agent_version: string;
            agent_key_ciphertext: string;
            agent_key_iv: string;
            agent_key_auth_tag: string;
            key_version: number;
          }[]
        >(
          `SELECT id, name, os, arch, agent_version, agent_key_ciphertext, agent_key_iv,
                agent_key_auth_tag, key_version
           FROM pending_agents WHERE id = $1 AND status = 'pending'`,
          [claimed.pending_agent_id],
        );
        // Already connected or expired: undo the claim by failing the transaction quietly.
        if (!agent) throw new NotClaimable();

        return build({
          pendingAgentId: agent.id,
          agentName: agent.name,
          os: agent.os,
          arch: agent.arch,
          agentVersion: agent.agent_version,
          agentKey: {
            ciphertext: agent.agent_key_ciphertext,
            iv: agent.agent_key_iv,
            authTag: agent.agent_key_auth_tag,
            keyVersion: agent.key_version,
          },
        });
      })
      .catch((err: unknown) => {
        if (err instanceof NotClaimable) return null;
        throw err;
      });
  }
}

class NotClaimable extends Error {}
