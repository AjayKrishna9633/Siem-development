import { injectable, inject } from 'inversify';
import { randomUUID } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { ICreateCompanyUseCase } from '../../interfaces/use-cases/company.interface.ts';
import type {
  ICompanyWithActivation,
  ICreateCompanyInput,
} from '../../types/use-case/company.types.ts';
import { Company } from '../../../domain/entities/company.entity.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole } from '../shared/access.ts';
import { onboardMember } from '../shared/onboard-member.ts';
import { toCompanySummary } from '../shared/company-summary.ts';

@injectable()
export class CreateCompanyUseCase implements ICreateCompanyUseCase {
  constructor(
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
  ) {}

  async execute(input: ICreateCompanyInput): Promise<ICompanyWithActivation> {
    assertRole(input.actor, UserRole.SUPER_ADMIN);

    if (await this.companies.findByName(input.name)) {
      throw new AppError(AppErrorCode.COMPANY_NAME_TAKEN, ErrorMessage.COMPANY_NAME_TAKEN);
    }
    // Checked up front so a taken admin email doesn't leave an admin-less company behind
    if (await this.users.findByEmail(input.adminEmail)) {
      throw new AppError(AppErrorCode.USER_ALREADY_EXISTS, ErrorMessage.USER_ALREADY_EXISTS);
    }

    const now = new Date();
    const company = Company.create({
      id: randomUUID(),
      name: input.name,
      createdById: input.actor.userId,
      now,
    });
    await this.companies.save(company);

    const { user: admin, activation } = await onboardMember(this.users, this.activations, {
      company,
      role: UserRole.ORG_ADMIN,
      username: input.adminName,
      email: input.adminEmail,
      invitedById: input.actor.userId,
      now,
    });

    company.assignAdmin(admin.id, now);
    await this.companies.save(company);

    return { company: toCompanySummary(company, admin, 1), activation };
  }
}
