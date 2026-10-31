import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IListTeamMembersUseCase } from '../../interfaces/use-cases/team.interface.ts';
import type { IListTeamMembersInput, ITeamMember } from '../../types/use-case/user-mgmt.types.ts';
import { assertPermission } from '../shared/access.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { toTeamMember } from './team-member.ts';

// Admins see everyone in the install
@injectable()
export class ListTeamMembersUseCase implements IListTeamMembersUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly users: IUserRepository) {}

  async execute(input: IListTeamMembersInput): Promise<ITeamMember[]> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const members = await this.users.findAll();
    return members.map(toTeamMember);
  }
}
