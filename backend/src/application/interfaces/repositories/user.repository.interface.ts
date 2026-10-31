import type { IBaseRepository } from './base.repository.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  // Everyone in this install, newest first
  findAll(): Promise<User[]>;
  findByIds(ids: string[]): Promise<User[]>;
  // For any change that could leave no active admin. In one transaction holding a lock
  // that every such change takes: loads the user, counts active admins, runs `change`
  // (which mutates the user or throws), then saves. Concurrent changes run one at a
  // time, so each sees the result of the last. Null when the user doesn't exist.
  changeWithAdminLock(
    userId: string,
    change: (user: User, activeAdminCount: number) => void,
  ): Promise<User | null>;
}
