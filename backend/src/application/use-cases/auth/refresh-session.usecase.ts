import { injectable, inject } from 'inversify';
import { startSession } from '../shared/user-views.ts';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type {
  IRefreshSessionInput,
  IRefreshSessionUseCase,
} from '../../interfaces/use-cases/refresh-session.interface.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

@injectable()
export class RefreshSessionUseCase implements IRefreshSessionUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.SessionService) private readonly _sessions: ISessionService,
  ) {}

  async execute(input: IRefreshSessionInput): Promise<ILoginResponse> {
    const record = await this._sessions.consume(input.refreshToken);
    const user = await this._users.findById(record.userId);

    if (!user || user.status !== UserStatus.ACTIVE || user.tokenVersion !== record.tokenVersion) {
      await this._sessions.revokeFamily(record.familyId);
      throw new AppError(AppErrorCode.SESSION_REVOKED, ErrorMessage.SESSION_REVOKED);
    }

    return startSession(this._sessions, user, record.familyId);
  }
}
