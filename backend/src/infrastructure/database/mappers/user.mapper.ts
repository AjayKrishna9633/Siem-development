import { injectable } from 'inversify';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import { User } from '../../../domain/entities/user.entity.ts';
import { UserModel } from '../models/user.model.ts';

@injectable()
export class UserMapper implements IMapper<User, UserModel> {
  toDomain(model: UserModel): User {
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

  toPersistence(entity: User): UserModel {
    const snapshot = entity.toSnapshot();
    const model = new UserModel();
    Object.assign(model, snapshot);
    return model;
  }
}
