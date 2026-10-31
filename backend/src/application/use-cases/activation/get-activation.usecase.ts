import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IGetActivationUseCase } from '../../interfaces/use-cases/activation.interface.ts';
import type { IActivationPreview } from '../../types/use-case/user-mgmt.types.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// The link is the credential: holding it opens the set-password step, which
// shows who is being activated ("Jane Doe, jane@acme.com — Tier 1 Analyst").
@injectable()
export class GetActivationUseCase implements IGetActivationUseCase {
  constructor(
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
  ) {}

  async execute(input: { activationId: string }): Promise<IActivationPreview> {
    const record = await this.activations.find(input.activationId);
    const user = record ? await this.users.findById(record.userId) : null;

    if (!record || !user || user.status !== UserStatus.INVITED) {
      throw new AppError(AppErrorCode.INVALID_ACTIVATION, ErrorMessage.INVALID_ACTIVATION);
    }

    return {
      username: user.username,
      email: user.email,
      role: user.role,
      expiresAt: record.expiresAt,
    };
  }
}
