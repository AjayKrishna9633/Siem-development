import { injectable, inject } from 'inversify';
import { randomUUID } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ICompleteSetupUseCase } from '../../interfaces/use-cases/setup.interface.ts';
import type { ICompleteSetupInput } from '../../dtos/setup/request/setup-request.dto.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import { User } from '../../../domain/entities/user.entity.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { startSession } from '../shared/user-views.ts';
import { auditActorOf } from '../shared/audit-actor.ts';
import {
  invalidSetupToken,
  isSetupTokenValid,
  recordAcceptedSetupToken,
  recordRejectedSetupToken,
  setupAlreadyCompleted,
} from './setup-token.ts';

@injectable()
export class CompleteSetupUseCase implements ICompleteSetupUseCase {
  constructor(
    @inject(TYPES.SystemSettingsRepository) private readonly _settings: ISystemSettingsRepository,
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
    @inject(TYPES.OpaqueTokenService) private readonly _tokens: IOpaqueTokenService,
    @inject(TYPES.HashService) private readonly _hasher: IHashService,
    @inject(TYPES.SessionService) private readonly _sessions: ISessionService,
  ) {}

  async execute(input: ICompleteSetupInput): Promise<ILoginResponse> {
    const passwordHash = await this._hasher.hash(input.password);
    const now = new Date();
    let tokenRejected = false;

    let admin: User;
    try {
      admin = await this._settings.completeSetup((locked) => {
        if (locked.isSetupCompleted) throw setupAlreadyCompleted();
        if (!isSetupTokenValid(locked, input.token, this._tokens, now)) {
          tokenRejected = true;
          throw invalidSetupToken();
        }

        locked.completeSetup({ orgName: input.orgName, baseUrl: input.baseUrl }, now);
        return User.createFirstAdmin({
          id: randomUUID(),
          email: input.email,
          username: input.adminName,
          passwordHash,
          now,
        });
      });
    } catch (err) {
      if (tokenRejected) await recordRejectedSetupToken(this._audit);
      throw err;
    }

    const actor = auditActorOf(admin);
    await recordAcceptedSetupToken(this._audit, actor);
    await this._audit.record({
      action: AuditAction.SETUP_COMPLETED,
      actor,
      targetType: AuditTargetType.USER,
      targetId: admin.id,
      targetLabel: admin.email,
      metadata: { email: admin.email, orgName: input.orgName },
    });

    admin.recordSuccessfulLogin(input.context.ip, now);
    await this._users.save(admin);
    return startSession(this._sessions, admin);
  }
}
