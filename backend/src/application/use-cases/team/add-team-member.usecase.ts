import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IAddTeamMemberUseCase } from '../../interfaces/use-cases/team.interface.ts';
import type {
  IAddTeamMemberInput,
  IAddTeamMemberResponse,
} from '../../types/use-case/user-mgmt.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole, loadCompany } from '../shared/access.ts';
import { onboardMember } from '../shared/onboard-member.ts';
import { toTeamMember } from './team-member.ts';

// A company admin adds an analyst to their own company — same link + temp password flow
@injectable()
export class AddTeamMemberUseCase implements IAddTeamMemberUseCase {
  constructor(
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
  ) {}

  async execute(input: IAddTeamMemberInput): Promise<IAddTeamMemberResponse> {
    assertRole(input.actor, UserRole.ORG_ADMIN);
    if (!input.actor.organizationId) {
      throw new AppError(AppErrorCode.FORBIDDEN, ErrorMessage.FORBIDDEN);
    }

    const company = await loadCompany(this.companies, input.actor.organizationId);
    if (!company.isActive) {
      throw new AppError(AppErrorCode.COMPANY_DEACTIVATED, ErrorMessage.COMPANY_DEACTIVATED);
    }

    const { user, activation } = await onboardMember(this.users, this.activations, {
      company,
      role: UserRole.ANALYST,
      username: input.username,
      email: input.email,
      invitedById: input.actor.userId,
      now: new Date(),
    });

    return { member: toTeamMember(user), activation };
  }
}
