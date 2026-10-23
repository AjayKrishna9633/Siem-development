import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IListCompaniesUseCase } from '../../interfaces/use-cases/company.interface.ts';
import type { IActor, ICompanySummary } from '../../types/use-case/company.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { assertRole } from '../shared/access.ts';
import { toCompanySummary } from '../shared/company-summary.ts';

@injectable()
export class ListCompaniesUseCase implements IListCompaniesUseCase {
  constructor(
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
  ) {}

  async execute(input: { actor: IActor }): Promise<ICompanySummary[]> {
    assertRole(input.actor, UserRole.SUPER_ADMIN);

    const companies = await this.companies.findAll();
    const adminIds = companies.map((c) => c.adminUserId).filter((id): id is string => !!id);
    const [admins, counts] = await Promise.all([
      this.users.findByIds(adminIds),
      this.users.countByOrganization(),
    ]);
    const adminById = new Map(admins.map((a) => [a.id, a]));

    // Only the admin is exposed; the super admin never receives the employee list
    return companies.map((c) =>
      toCompanySummary(
        c,
        c.adminUserId ? (adminById.get(c.adminUserId) ?? null) : null,
        counts.get(c.id) ?? 0,
      ),
    );
  }
}
