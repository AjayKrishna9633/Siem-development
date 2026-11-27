import type { IAuditRecord } from './audit-log.repository.interface.ts';
import type {
  IEnrollmentLinkSummary,
  IEnrollmentToken,
  IPendingAgent,
} from '../../../domain/types/pending-agent.types.ts';

export type RevokeOutcome = 'revoked' | 'not_found' | 'not_pending';

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
}
