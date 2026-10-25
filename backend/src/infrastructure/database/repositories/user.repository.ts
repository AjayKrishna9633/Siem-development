import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import { In, type DataSource } from 'typeorm';
import type { IUserRepository } from '../../../application/interfaces/repositories/user.repository.interface.ts';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import { BaseRepository } from './base.repository.ts';
import { UserModel } from '../models/user.model.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { normalizeEmail } from '../../../domain/policies/credentials.policy.ts';

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

  countSuperAdmins(): Promise<number> {
    return this.repository.count({ where: { role: UserRole.SUPER_ADMIN } });
  }

  createSuperAdmin(user: User): Promise<'created' | 'already_exists'> {
    return this.db.transaction<'created' | 'already_exists'>(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('bootstrap_super_admin'))`);

      const existing = await manager.countBy(UserModel, { role: UserRole.SUPER_ADMIN });
      if (existing > 0) return 'already_exists';

      await manager.insert(UserModel, user.toSnapshot());

      return 'created';
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const model = await this.repository.findOne({
      where: { email: normalizeEmail(email) },
    });
    if (!model) return null;

    return this.mapper.toDomain(model);
  }

  async findAll(options?: { organizationId?: string }): Promise<User[]> {
    const where = options?.organizationId ? { organizationId: options.organizationId } : {};
    const models = await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return models.map((model) => this.mapper.toDomain(model));
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const models = await this.repository.find({ where: { id: In(ids) } });
    return models.map((model) => this.mapper.toDomain(model));
  }

  countInOrganization(organizationId: string): Promise<number> {
    return this.repository.count({ where: { organizationId } });
  }

  async countByOrganization(): Promise<Map<string, number>> {
    const rows = await this.repository
      .createQueryBuilder('user')
      .select('user.organization_id', 'organizationId')
      .addSelect('COUNT(*)', 'count')
      .where('user.organization_id IS NOT NULL')
      .groupBy('user.organization_id')
      .getRawMany<{ organizationId: string; count: string }>();
    return new Map(rows.map((r) => [r.organizationId, Number(r.count)]));
  }
}
