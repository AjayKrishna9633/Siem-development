import type { IAuditRecord } from './audit-log.repository.interface.ts';
import type {
  ISyncCandidate,
  IEnrollmentLinkSummary,
  IEnrollmentToken,
  IPendingAgent,
} from '../../../domain/types/pending-agent.types.ts';

export type RevokeOutcome = 'revoked' | 'not_found' | 'not_pending';

// 'skipped': the row is locked by someone else (a revoke) or is no longer pending.
export type SyncOutcome = 'applied' | 'skipped';

export interface IPendingAgentRepository {
  hasPendingName(name: string): Promise<boolean>;
  // The agent, its link and the audit row, in one transaction.
  createWithLink(agent: IPendingAgent, token: IEnrollmentToken, audit: IAuditRecord): Promise<void>;
  // Agents still waiting to connect, newest first.
  listPending(): Promise<IEnrollmentLinkSummary[]>;
  // Locks the row, checks it is still pending, runs removeFromManager (so a sync can't mark it
  // connected in between), then deletes it with its link and writes the audit row.
  revokePending(
    id: string,
    removeFromManager: (agent: IPendingAgent) => Promise<void>,
    audit: (agent: IPendingAgent) => IAuditRecord,
  ): Promise<RevokeOutcome>;

  // Pending agents with their link expiry, read without locking.
  listSyncCandidates(): Promise<ISyncCandidate[]>;
  // Each takes the row with FOR UPDATE SKIP LOCKED and re-checks it is still pending, so a revoke
  // in progress is never blocked or overwritten, and two ticks can't both apply a change.
  markConnected(id: string, connectedAt: Date, audit: IAuditRecord): Promise<SyncOutcome>;
  // Also re-checks the link expired before `now`. removeFromManager runs while the row is held;
  // if it throws, nothing changes and the error is passed on.
  markExpired(
    id: string,
    now: Date,
    removeFromManager: () => Promise<void>,
    audit: IAuditRecord,
  ): Promise<SyncOutcome>;
}
