import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IAddTeamMemberUseCase } from '../../interfaces/use-cases/team.interface.ts';
import type {
  IAddTeamMemberInput,
  IAddTeamMemberResponse,
} from '../../types/use-case/user-mgmt.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { assertRole } from '../shared/access.ts';
import { onboardMember } from '../shared/onboard-member.ts';
import { toTeamMember } from './team-member.ts';

// An admin adds a team member with a chosen role — link + temporary password flow
@injectable()
export class AddTeamMemberUseCase implements IAddTeamMemberUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
  ) {}

  async execute(input: IAddTeamMemberInput): Promise<IAddTeamMemberResponse> {
    assertRole(input.actor, UserRole.ADMIN);

    const { user, activation } = await onboardMember(this.users, this.activations, {
      role: input.role,
      username: input.username,
      email: input.email,
      invitedById: input.actor.userId,
      now: new Date(),
    });

    return { member: toTeamMember(user), activation };
  }
}
