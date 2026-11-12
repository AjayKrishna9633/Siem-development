import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import { In, type DataSource } from 'typeorm';
import type { IUserRepository } from '../../../application/interfaces/repositories/user.repository.interface.ts';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import { BaseRepository } from './base.repository.ts';
import { UserModel } from '../models/user.model.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import type {
  IUserListQuery,
  UserSortKey,
} from '../../../application/dtos/user/request/user-request.dto.ts';
import { normalizeEmail } from '../../../domain/policies/credentials.policy.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';

const SORT_COLUMNS: Record<UserSortKey, string> = {
  name: 'LOWER(COALESCE(u.username, u.email))',
  email: 'u.email',
  role: 'u.role',
  status: 'u.status',
  lastLogin: 'u.lastLoginAt',
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

@injectable()
export class TypeOrmUserRepository
  extends BaseRepository<User, UserModel>
  implements IUserRepository
{
  constructor(
    @inject(TYPES.DataSource) db: DataSource,
    @inject(TYPES.UserMapper) mapper: IMapper<User, UserModel>,
  ) {
    super(db, UserModel, mapper);
  }

  async findByEmail(email: string): Promise<User | null> {
    const model = await this.repository.findOne({
      where: { email: normalizeEmail(email) },
    });
    if (!model) return null;

    return this.mapper.toDomain(model);
  }

  async findAll(): Promise<User[]> {
    const models = await this.repository.find({ order: { createdAt: 'DESC' } });
    return models.map((model) => this.mapper.toDomain(model));
  }

  async findPage(query: IUserListQuery): Promise<{ users: User[]; total: number }> {
    const qb = this.repository.createQueryBuilder('u');
    if (query.search) {
      qb.andWhere('(u.email ILIKE :search OR u.username ILIKE :search)', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });

    const [models, total] = await qb
      .orderBy(SORT_COLUMNS[query.sortBy], query.sortDir === 'asc' ? 'ASC' : 'DESC', 'NULLS LAST')
      .addOrderBy('u.id', 'ASC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getManyAndCount();

    return { users: models.map((model) => this.mapper.toDomain(model)), total };
  }

  async countByStatus(): Promise<Record<UserStatus, number>> {
    const rows = await this.repository
      .createQueryBuilder('u')
      .select('u.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.status')
      .getRawMany<{ status: UserStatus; count: string }>();

    const counts: Record<UserStatus, number> = {
      [UserStatus.INVITED]: 0,
      [UserStatus.ACTIVE]: 0,
      [UserStatus.DISABLED]: 0,
    };
    for (const row of rows) counts[row.status] = Number(row.count);
    return counts;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const models = await this.repository.find({ where: { id: In(ids) } });
    return models.map((model) => this.mapper.toDomain(model));
  }

  async deleteInvited(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id, status: UserStatus.INVITED });
    return result.affected === 1;
  }

  changeWithAdminLock(
    userId: string,
    change: (user: User, activeAdminCount: number) => void,
  ): Promise<User | null> {
    return this.db.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('users_admin_change'))`);

      const model = await manager.findOne(UserModel, { where: { id: userId } });
      if (!model) return null;
      const activeAdminCount = await manager.countBy(UserModel, {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const user = this.mapper.toDomain(model);
      change(user, activeAdminCount);
      await manager.save(UserModel, this.mapper.toPersistence(user));
      return user;
    });
  }
}
