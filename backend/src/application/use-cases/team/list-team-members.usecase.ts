import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IListTeamMembersUseCase } from '../../interfaces/use-cases/team.interface.ts';
import type { IListTeamMembersInput, ITeamMember } from '../../types/use-case/user-mgmt.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole } from '../shared/access.ts';
import { toTeamMember } from './team-member.ts';

// Only a company admin sees its people; the super admin sees companies, not employees
@injectable()
export class ListTeamMembersUseCase implements IListTeamMembersUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly users: IUserRepository) {}

  async execute(input: IListTeamMembersInput): Promise<ITeamMember[]> {
    assertRole(input.actor, UserRole.ORG_ADMIN);
    if (!input.actor.organizationId) {
      throw new AppError(AppErrorCode.FORBIDDEN, ErrorMessage.FORBIDDEN);
    }

    const members = await this.users.findAll({ organizationId: input.actor.organizationId });
    return members.map(toTeamMember);
  }
}
