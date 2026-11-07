import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IListUsersUseCase } from '../../interfaces/use-cases/users.interface.ts';
import type { IListUsersInput, IUserPage } from '../../types/use-case/user-mgmt.types.ts';
import { assertPermission } from '../shared/access.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { toManagedUser } from './managed-user.ts';

@injectable()
export class ListUsersUseCase implements IListUsersUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly users: IUserRepository) {}

  async execute(input: IListUsersInput): Promise<IUserPage> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const [{ users, total }, byStatus] = await Promise.all([
      this.users.findPage(input.query),
      this.users.countByStatus(),
    ]);

    return {
      items: users.map(toManagedUser),
      page: input.query.page,
      pageSize: input.query.pageSize,
      total,
      counts: {
        all: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
        invited: byStatus[UserStatus.INVITED],
        disabled: byStatus[UserStatus.DISABLED],
      },
    };
  }
}
