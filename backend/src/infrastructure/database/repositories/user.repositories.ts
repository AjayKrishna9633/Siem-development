import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { DataSource } from 'typeorm';
import type { IUserRepository } from '../../../application/interfaces/repositories/user.repository.interface.ts';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import { BaseRepository } from './base.repository.ts';
import { UserModel } from '../models/user.model.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import type { ICreateInvitedDTO } from '../../../application/dtos/user/request/user-request.dto.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';

@injectable()
export class TypeOrmuUserRepository
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

  async createInvited(input: ICreateInvitedDTO): Promise<void> {
    await this.repository.insert(input);
  }

  async findByEmail(email: string): Promise<User | null> {
    const model = await this.repository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!model) return null;

    return this.mapper.toDomain(model);
  }
}
