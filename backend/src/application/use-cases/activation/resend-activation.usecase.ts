import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type {
  IActivationGrant,
  IActivationService,
} from '../../interfaces/services/activation.service.interface.ts';
import type { IResendActivationUseCase } from '../../interfaces/use-cases/activation.interface.ts';
import type { IResendActivationInput } from '../../types/use-case/user-mgmt.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole } from '../shared/access.ts';

// Issues a new link + temporary password (the old one stops working).
// Admins only.
@injectable()
export class ResendActivationUseCase implements IResendActivationUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
  ) {}

  async execute(input: IResendActivationInput): Promise<IActivationGrant> {
    assertRole(input.actor, UserRole.ADMIN);

    const target = await this.users.findById(input.userId);
    if (!target) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    if (target.status !== UserStatus.INVITED) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.ACTIVATION_NOT_PENDING);
    }

    return this.activations.issue({
      userId: target.id,
      email: target.email,
      username: target.username,
      role: target.role,
    });
  }
}
