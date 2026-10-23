import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
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
import { loadCompany } from '../shared/access.ts';

// Issues a new link + temporary password (the old one stops working).
// Super admin → company admins; company admin → analysts in their own company.
@injectable()
export class ResendActivationUseCase implements IResendActivationUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
  ) {}

  async execute(input: IResendActivationInput): Promise<IActivationGrant> {
    const target = await this.users.findById(input.userId);
    if (!target || !target.organizationId) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    const { actor } = input;
    const allowed =
      (actor.role === UserRole.SUPER_ADMIN && target.role === UserRole.ORG_ADMIN) ||
      (actor.role === UserRole.ORG_ADMIN &&
        target.role === UserRole.ANALYST &&
        target.organizationId === actor.organizationId);
    if (!allowed) {
      throw new AppError(AppErrorCode.FORBIDDEN, ErrorMessage.FORBIDDEN);
    }

    if (target.status !== UserStatus.INVITED) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.ACTIVATION_NOT_PENDING);
    }

    const company = await loadCompany(this.companies, target.organizationId);
    if (!company.isActive) {
      throw new AppError(AppErrorCode.COMPANY_DEACTIVATED, ErrorMessage.COMPANY_DEACTIVATED);
    }

    return this.activations.issue({
      userId: target.id,
      email: target.email,
      username: target.username,
      role: target.role,
      companyName: company.name,
    });
  }
}
