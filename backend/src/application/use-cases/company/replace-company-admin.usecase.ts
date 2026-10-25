import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IReplaceCompanyAdminUseCase } from '../../interfaces/use-cases/company.interface.ts';
import type {
  ICompanyWithActivation,
  IReplaceCompanyAdminInput,
} from '../../types/use-case/company.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole, loadCompany } from '../shared/access.ts';
import { onboardMember } from '../shared/onboard-member.ts';
import { summarizeCompany } from '../shared/company-summary.ts';

// "Remove admin": the current admin is disabled (sessions revoked via tokenVersion)
// and a new admin is onboarded with a fresh activation link + temporary password.
@injectable()
export class ReplaceCompanyAdminUseCase implements IReplaceCompanyAdminUseCase {
  constructor(
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
  ) {}

  async execute(input: IReplaceCompanyAdminInput): Promise<ICompanyWithActivation> {
    assertRole(input.actor, UserRole.SUPER_ADMIN);
    const company = await loadCompany(this.companies, input.companyId);
    // The new admin could never sign in, so the old one would be locked out for nothing
    if (!company.isActive) {
      throw new AppError(
        AppErrorCode.COMPANY_DEACTIVATED,
        ErrorMessage.REACTIVATE_BEFORE_ADMIN_CHANGE,
      );
    }
    const now = new Date();

    const { user: newAdmin, activation } = await onboardMember(this.users, this.activations, {
      company,
      role: UserRole.ORG_ADMIN,
      username: input.adminName,
      email: input.adminEmail,
      invitedById: input.actor.userId,
      now,
    });

    const previous = company.adminUserId ? await this.users.findById(company.adminUserId) : null;
    if (previous && previous.status !== UserStatus.DISABLED) {
      previous.disable(now);
      await this.users.save(previous);
    }
    if (previous) await this.activations.revokeForUser(previous.id);

    company.assignAdmin(newAdmin.id, now);
    await this.companies.save(company);

    return { company: await summarizeCompany(this.users, company), activation };
  }
}
