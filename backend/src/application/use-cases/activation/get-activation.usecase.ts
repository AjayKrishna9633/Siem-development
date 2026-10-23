import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IGetActivationUseCase } from '../../interfaces/use-cases/activation.interface.ts';
import type { IActivationPreview } from '../../types/use-case/user-mgmt.types.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// Lets the activation page greet the person ("Join Acme Corp as Analyst")
// without revealing the email, which they must type themselves.
@injectable()
export class GetActivationUseCase implements IGetActivationUseCase {
  constructor(
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
  ) {}

  async execute(input: { activationId: string }): Promise<IActivationPreview> {
    const record = await this.activations.find(input.activationId);
    const user = record ? await this.users.findById(record.userId) : null;
    const company = user?.organizationId
      ? await this.companies.findById(user.organizationId)
      : null;

    if (!record || !user || user.status !== UserStatus.INVITED || !company) {
      throw new AppError(AppErrorCode.INVALID_ACTIVATION, ErrorMessage.INVALID_ACTIVATION);
    }

    return {
      companyName: company.name,
      username: user.username,
      role: user.role,
      expiresAt: record.expiresAt,
    };
  }
}
