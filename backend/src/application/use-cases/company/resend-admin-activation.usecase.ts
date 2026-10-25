import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IResendAdminActivationUseCase } from '../../interfaces/use-cases/company.interface.ts';
import type { IResendActivationUseCase } from '../../interfaces/use-cases/activation.interface.ts';
import type { IActivationGrant } from '../../interfaces/services/activation.service.interface.ts';
import type { IResendAdminActivationInput } from '../../types/use-case/company.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole, loadCompany } from '../shared/access.ts';

// The super admin resends by company: this finds the company's admin, then reuses the
// general "resend activation" rules (role checks, still pending, company active)
@injectable()
export class ResendAdminActivationUseCase implements IResendAdminActivationUseCase {
  constructor(
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.ResendActivationUseCase)
    private readonly resendActivation: IResendActivationUseCase,
  ) {}

  async execute(input: IResendAdminActivationInput): Promise<IActivationGrant> {
    assertRole(input.actor, UserRole.SUPER_ADMIN);
    const company = await loadCompany(this.companies, input.companyId);
    if (!company.adminUserId) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    return this.resendActivation.execute({ actor: input.actor, userId: company.adminUserId });
  }
}
