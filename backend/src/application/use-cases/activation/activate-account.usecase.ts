import { injectable, inject } from 'inversify';
import { startSession } from '../shared/user-views.ts';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { IActivateAccountUseCase } from '../../interfaces/use-cases/activation.interface.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import type { IActivateAccountInput } from '../../types/use-case/user-mgmt.types.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertCompanyActive } from '../shared/access.ts';

// The activation ID (from the link, or handed back after the temporary password
// was verified) proves identity; the new password activates the account and the
// person is signed in straight away.
@injectable()
export class ActivateAccountUseCase implements IActivateAccountUseCase {
  constructor(
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
  ) {}

  async execute(input: IActivateAccountInput): Promise<ILoginResponse> {
    const invalid = new AppError(AppErrorCode.INVALID_ACTIVATION, ErrorMessage.INVALID_ACTIVATION);

    const record = await this.activations.find(input.activationId);
    if (!record) throw invalid;

    const user = await this.users.findById(record.userId);
    if (!user || user.status !== UserStatus.INVITED) {
      await this.activations.consume(input.activationId, record.userId);
      throw invalid;
    }
    await assertCompanyActive(this.companies, user);

    const now = new Date();
    user.acceptInvite(await this.hasher.hash(input.newPassword), now);
    user.recordSuccessfulLogin(null, now);
    await this.users.save(user);
    await this.activations.consume(input.activationId, user.id);

    return startSession(this.sessions, user);
  }
}
