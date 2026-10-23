import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISetCompanyStatusUseCase } from '../../interfaces/use-cases/company.interface.ts';
import type {
  ICompanySummary,
  ISetCompanyStatusInput,
} from '../../types/use-case/company.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { assertRole, loadCompany } from '../shared/access.ts';
import { summarizeCompany } from '../shared/company-summary.ts';

// Deactivate / reactivate. Members are blocked at login and token refresh while
// deactivated, so open sessions end within one access-token lifetime.
@injectable()
export class SetCompanyStatusUseCase implements ISetCompanyStatusUseCase {
  constructor(
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
  ) {}

  async execute(input: ISetCompanyStatusInput): Promise<ICompanySummary> {
    assertRole(input.actor, UserRole.SUPER_ADMIN);
    const company = await loadCompany(this.companies, input.companyId);

    const now = new Date();
    if (input.active) company.reactivate(now);
    else company.deactivate(now);
    await this.companies.save(company);

    return summarizeCompany(this.users, company);
  }
}
