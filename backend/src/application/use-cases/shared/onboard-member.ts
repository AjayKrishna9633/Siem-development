import { randomUUID } from 'node:crypto';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type {
  IActivationGrant,
  IActivationService,
} from '../../interfaces/services/activation.service.interface.ts';
import { User } from '../../../domain/entities/user.entity.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

interface IOnboardMemberInput {
  role: UserRole;
  username: string;
  email: string;
  invitedById: string;
  now: Date;
}

// Used when an admin adds someone: the person is created as INVITED and receives an activation link plus temporary password.
export const onboardMember = async (
  users: IUserRepository,
  activations: IActivationService,
  input: IOnboardMemberInput,
): Promise<{ user: User; activation: IActivationGrant }> => {
  const { email } = input;

  if (await users.findByEmail(email)) {
    throw new AppError(AppErrorCode.USER_ALREADY_EXISTS, ErrorMessage.USER_ALREADY_EXISTS);
  }

  const user = User.createInvited({
    id: randomUUID(),
    email,
    username: input.username,
    role: input.role,
    invitedById: input.invitedById,
    now: input.now,
  });
  await users.save(user);

  const activation = await activations.issue({
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  return { user, activation };
};
