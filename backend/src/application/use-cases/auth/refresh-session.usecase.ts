import { injectable, inject } from 'inversify';
import { startSession } from '../shared/user-views.ts';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import { assertCompanyActive } from '../shared/access.ts';
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
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
  ) {}

  async execute(input: IRefreshSessionInput): Promise<ILoginResponse> {
    const record = await this.sessions.consume(input.refreshToken);
    const user = await this.users.findById(record.userId);

    // A password change, disable or deletion ends every session for the user
    if (!user || user.status !== UserStatus.ACTIVE || user.tokenVersion !== record.tokenVersion) {
      await this.sessions.revokeFamily(record.familyId);
      throw new AppError(AppErrorCode.SESSION_REVOKED, ErrorMessage.SESSION_REVOKED);
    }

    try {
      await assertCompanyActive(this.companies, user);
    } catch (err) {
      await this.sessions.revokeFamily(record.familyId);
      throw err;
    }

    return startSession(this.sessions, user, record.familyId);
  }
}
