import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IUpdateCompanyUseCase } from '../../interfaces/use-cases/company.interface.ts';
import type { ICompanySummary, IUpdateCompanyInput } from '../../types/use-case/company.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole, loadCompany } from '../shared/access.ts';
import { summarizeCompany } from '../shared/company-summary.ts';

@injectable()
export class UpdateCompanyUseCase implements IUpdateCompanyUseCase {
  constructor(
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
  ) {}

  async execute(input: IUpdateCompanyInput): Promise<ICompanySummary> {
    assertRole(input.actor, UserRole.SUPER_ADMIN);
    const company = await loadCompany(this.companies, input.companyId);

    const clash = await this.companies.findByName(input.name);
    if (clash && clash.id !== company.id) {
      throw new AppError(AppErrorCode.COMPANY_NAME_TAKEN, ErrorMessage.COMPANY_NAME_TAKEN);
    }

    company.rename(input.name, new Date());
    await this.companies.save(company);

    return summarizeCompany(this.users, company);
  }
}
