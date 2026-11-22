import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import { AUDIT_CATEGORY_BY_ACTION } from '../../domain/constants/audit.ts';
import { AuditOutcome } from '../../domain/enums/AuditOutcome.ts';
import { redactMetadata } from '../../domain/policies/audit-redaction.policy.ts';
import type {
  IAuditLogRepository,
  IAuditRecord,
} from '../../application/interfaces/repositories/audit-log.repository.interface.ts';
import type {
  IAuditEvent,
  IAuditService,
} from '../../application/interfaces/services/audit.service.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';
import type { IRequestContextProvider } from '../../application/interfaces/services/request-context.provider.interface.ts';

const LIMITS = {
  username: 255,
  role: 32,
  targetId: 64,
  targetLabel: 255,
  ip: 45,
  userAgent: 512,
  requestId: 128,
} as const;

const clip = (value: string | null | undefined, max: number): string | null =>
  value == null ? null : value.slice(0, max);

@injectable()
export class AuditService implements IAuditService {
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.AuditLogRepository) private readonly _repository: IAuditLogRepository,
    @inject(TYPES.RequestContextProvider) private readonly _context: IRequestContextProvider,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'audit' });
  }

  async record(event: IAuditEvent): Promise<void> {
    try {
      await this._repository.insert(this.prepare(event));
    } catch (error: unknown) {
      // Not rethrown; metadata is left out of the log line.
      this._logger.error('audit write failed', {
        err: error,
        action: event.action,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
      });
    }
  }

  prepare(event: IAuditEvent): IAuditRecord {
    const scope = this._context.current();
    const actor = event.actor !== undefined ? event.actor : (scope?.actor ?? null);

    return {
      actorId: actor?.userId ?? null,
      actorUsername: clip(actor?.username, LIMITS.username),
      actorRole: clip(actor?.role, LIMITS.role),
      action: event.action,
      category: AUDIT_CATEGORY_BY_ACTION[event.action],
      outcome: event.outcome ?? AuditOutcome.SUCCESS,
      targetType: event.targetType ?? null,
      targetId: clip(event.targetId, LIMITS.targetId),
      targetLabel: clip(event.targetLabel, LIMITS.targetLabel),
      ipAddress: clip(scope?.ip, LIMITS.ip),
      userAgent: clip(scope?.userAgent, LIMITS.userAgent),
      requestId: clip(scope?.requestId, LIMITS.requestId),
      metadata: redactMetadata(event.metadata ?? {}),
    };
  }
}
