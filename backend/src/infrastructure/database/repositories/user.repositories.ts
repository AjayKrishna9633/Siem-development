import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { DataSource } from 'typeorm';
import type { IUserRepository } from '../../../application/interfaces/repositories/user.repository.interface.ts';
import { UserModel } from '../models/user.model.ts';
import { User } from '../../../domain/entities/user.entity.ts';
import type { ICreateInvitedDTO } from '../../../application/dtos/user/request/user-request.dto.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';

@injectable()
export class TypeOrmuUserRepository implements IUserRepository {
  constructor(@inject(TYPES.DataSource) private readonly db: DataSource) {}

  countSuperAdmins(): Promise<number> {
    return this.db.getRepository(UserModel).count({ where: { role: UserRole.SUPER_ADMIN } });
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
    await this.db.getRepository(UserModel).insert(input);
  }

  async findByEmail(email: string): Promise<User | null> {
    const model = await this.db.getRepository(UserModel).findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!model) return null;

    return User.reconstitute({
      id: model.id,
      organizationId: model.organizationId,
      email: model.email,
      username: model.username,
      passwordHash: model.passwordHash,
      role: model.role,
      status: model.status,
      isEmailVerified: model.isEmailVerified,
      tokenVersion: model.tokenVersion,
      failedLoginAttempts: model.failedLoginAttempts,
      lockedUntil: model.lockedUntil,
      passwordChangedAt: model.passwordChangedAt,
      lastLoginAt: model.lastLoginAt,
      lastLoginIp: model.lastLoginIp,
      invitedById: model.invitedById,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  async save(user: User): Promise<void> {
    const snapshot = user.toSnapshot();
    await this.db.getRepository(UserModel).save(snapshot);
  }
}
