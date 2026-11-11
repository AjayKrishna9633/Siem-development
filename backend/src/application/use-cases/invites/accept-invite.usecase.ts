import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { IAcceptInviteUseCase } from '../../interfaces/use-cases/invites.interface.ts';
import type { IAcceptInviteInput } from '../../dtos/invite/request/invite-request.dto.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { startSession } from '../shared/user-views.ts';
import { invalidInvite } from './invite-delivery.ts';

@injectable()
export class AcceptInviteUseCase implements IAcceptInviteUseCase {
  constructor(
    @inject(TYPES.AuthTokenService) private readonly _tokens: IAuthTokenService,
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.HashService) private readonly _hasher: IHashService,
    @inject(TYPES.SessionService) private readonly _sessions: ISessionService,
    @inject(TYPES.AuditLogRepository) private readonly _audit: IAuditLogRepository,
  ) {}

  async execute(input: IAcceptInviteInput): Promise<ILoginResponse> {
    const link = await this._tokens.findUsable(input.token, AuthTokenType.INVITE);
    const user = link ? await this._users.findById(link.userId) : null;
    if (!link || !user || user.status !== UserStatus.INVITED) throw invalidInvite();

    const passwordHash = await this._hasher.hash(input.password);

    if (!(await this._tokens.consume(link))) throw invalidInvite();

    const now = new Date();
    user.acceptInvite(input.name, passwordHash, now);
    user.recordSuccessfulLogin(input.context.ip, now);
    await this._users.save(user);

    await this._audit.append({
      actorUserId: user.id,
      action: AuditAction.INVITE_ACCEPTED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
      metadata: { email: user.email, role: user.role },
    });

    return startSession(this._sessions, user);
  }
}
