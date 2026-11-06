import type { IBaseRepository } from './base.repository.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findByIds(ids: string[]): Promise<User[]>;
  deleteInvited(id: string): Promise<boolean>;
  changeWithAdminLock(
    userId: string,
    change: (user: User, activeAdminCount: number) => void,
  ): Promise<User | null>;
}
