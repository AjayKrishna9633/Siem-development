import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IListUsersUseCase } from '../../interfaces/use-cases/users.interface.ts';
import type { IListUsersInput, IManagedUser } from '../../types/use-case/user-mgmt.types.ts';
import { assertPermission } from '../shared/access.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { toManagedUser } from './managed-user.ts';

@injectable()
export class ListUsersUseCase implements IListUsersUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly users: IUserRepository) {}

  async execute(input: IListUsersInput): Promise<IManagedUser[]> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const members = await this.users.findAll();
    return members.map(toManagedUser);
  }
}
