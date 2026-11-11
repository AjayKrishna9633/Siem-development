import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IResetPasswordUseCase } from '../../interfaces/use-cases/password-reset.interface.ts';
import type { IResetPasswordInput } from '../../dtos/password-reset/request/password-reset-request.dto.ts';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { assertPasswordPolicy } from '../shared/access.ts';
import { invalidResetLink } from './reset-link.ts';

@injectable()
export class ResetPasswordUseCase implements IResetPasswordUseCase {
  constructor(
    @inject(TYPES.AuthTokenService) private readonly _tokens: IAuthTokenService,
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.HashService) private readonly _hasher: IHashService,
    @inject(TYPES.SecurityMailer) private readonly _mailer: ISecurityMailer,
    @inject(TYPES.AuditLogRepository) private readonly _audit: IAuditLogRepository,
  ) {}

  async execute(input: IResetPasswordInput): Promise<void> {
    assertPasswordPolicy(input.password);

    const link = await this._tokens.findUsable(input.token, AuthTokenType.RESET);
    const user = link ? await this._users.findById(link.userId) : null;
    if (!link || !user || user.status !== UserStatus.ACTIVE) throw invalidResetLink();

    const passwordHash = await this._hasher.hash(input.password);
    if (!(await this._tokens.consume(link))) throw invalidResetLink();

    user.resetPassword(passwordHash, new Date());
    await this._users.save(user);

    await this._audit.append({
      actorUserId: user.id,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
      metadata: { email: user.email },
    });
    await this._mailer.notifyPasswordChanged({ to: user.email, username: user.displayName });
  }
}
