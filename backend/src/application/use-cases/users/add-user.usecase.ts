import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IActivationService } from '../../interfaces/services/activation.service.interface.ts';
import type { IAddUserUseCase } from '../../interfaces/use-cases/users.interface.ts';
import type { IAddUserInput, IAddUserResponse } from '../../types/use-case/user-mgmt.types.ts';
import { assertPermission } from '../shared/access.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { onboardMember } from '../shared/onboard-member.ts';
import { toManagedUser } from './managed-user.ts';

// An admin adds a user with a chosen role — link + temporary password flow
@injectable()
export class AddUserUseCase implements IAddUserUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.ActivationService) private readonly activations: IActivationService,
  ) {}

  async execute(input: IAddUserInput): Promise<IAddUserResponse> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const { user, activation } = await onboardMember(this.users, this.activations, {
      role: input.role,
      username: input.username,
      email: input.email,
      invitedById: input.actor.userId,
      now: new Date(),
    });

    return { member: toManagedUser(user), activation };
  }
}
