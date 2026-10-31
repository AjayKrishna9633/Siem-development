import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import { In, type DataSource } from 'typeorm';
import type { IUserRepository } from '../../../application/interfaces/repositories/user.repository.interface.ts';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import { BaseRepository } from './base.repository.ts';
import { UserModel } from '../models/user.model.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
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

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const models = await this.repository.find({ where: { id: In(ids) } });
    return models.map((model) => this.mapper.toDomain(model));
  }
}
