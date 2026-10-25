import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type {
  IGetActivationUseCase,
  IVerifyActivationUseCase,
} from '../../interfaces/use-cases/activation.interface.ts';
import type {
  IVerifiedActivation,
  IVerifyActivationInput,
} from '../../types/use-case/user-mgmt.types.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// The no-link route: email + temporary password unlock the same set-password
// step the activation link opens.
@injectable()
export class VerifyActivationUseCase implements IVerifyActivationUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.GetActivationUseCase) private readonly getActivation: IGetActivationUseCase,
  ) {}

  async execute(input: IVerifyActivationInput): Promise<IVerifiedActivation> {
    const invalid = new AppError(
      AppErrorCode.INVALID_ACTIVATION,
      ErrorMessage.INVALID_TEMPORARY_PASSWORD,
    );

    // An unknown email and a wrong password get the same answer
    const user = await this.users.findByEmail(input.email);
    if (!user || user.status !== UserStatus.INVITED) throw invalid;

    const pending = await this.activations.findForUser(user.id);
    if (!pending) throw invalid;

    const matches = await this.hasher.compare(
      input.temporaryPassword.trim(),
      pending.record.temporaryPasswordHash,
    );
    if (!matches) {
      await this.activations.recordFailure(pending.activationId, pending.record);
      throw invalid;
    }

    const preview = await this.getActivation.execute({ activationId: pending.activationId });
    return { activationId: pending.activationId, ...preview };
  }
}
