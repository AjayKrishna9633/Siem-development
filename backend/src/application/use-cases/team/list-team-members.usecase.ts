import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IListTeamMembersUseCase } from '../../interfaces/use-cases/team.interface.ts';
import type { IListTeamMembersInput, ITeamMember } from '../../types/use-case/user-mgmt.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { assertRole } from '../shared/access.ts';
import { toTeamMember } from './team-member.ts';

// Admins see everyone in the install
@injectable()
export class ListTeamMembersUseCase implements IListTeamMembersUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly users: IUserRepository) {}

  async execute(input: IListTeamMembersInput): Promise<ITeamMember[]> {
    assertRole(input.actor, UserRole.ADMIN);

    const members = await this.users.findAll();
    return members.map(toTeamMember);
  }
}
