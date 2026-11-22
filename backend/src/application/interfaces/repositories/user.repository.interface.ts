import type { IBaseRepository } from './base.repository.interface.ts';
import type { IAuditRecord } from './audit-log.repository.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import type { UserStatus } from '../../../domain/enums/UserStatus.ts';
import type { IUserListQuery } from '../../dtos/user/request/user-request.dto.ts';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findPage(query: IUserListQuery): Promise<{ users: User[]; total: number }>;
  countByStatus(): Promise<Record<UserStatus, number>>;
  findByIds(ids: string[]): Promise<User[]>;
  deleteInvited(id: string): Promise<boolean>;
  // The row `audit` returns is written in the same transaction. Return null for no change.
  changeWithAdminLock(
    userId: string,
    change: (user: User, activeAdminCount: number) => void,
    audit?: (user: User) => IAuditRecord | null,
  ): Promise<User | null>;
}
