import { injectable, inject } from 'inversify';
import { IsNull, MoreThan, type DataSource } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type {
  IAuthTokenRecord,
  IAuthTokenRepository,
  INewAuthToken,
} from '../../../application/interfaces/repositories/auth-token.repository.interface.ts';
import type { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { AuthTokenModel } from '../models/auth-token.model.ts';

const toRecord = (model: AuthTokenModel): IAuthTokenRecord => ({
  id: model.id,
  userId: model.userId,
  type: model.type,
  expiresAt: model.expiresAt,
  createdBy: model.createdBy,
  createdAt: model.createdAt,
});

@injectable()
export class TypeOrmAuthTokenRepository implements IAuthTokenRepository {
  constructor(@inject(TYPES.DataSource) private readonly db: DataSource) {}

  async replace(token: INewAuthToken): Promise<void> {
    await this.db.transaction(async (manager) => {
      await manager.delete(AuthTokenModel, {
        userId: token.userId,
        type: token.type,
        usedAt: IsNull(),
      });
      await manager.insert(AuthTokenModel, { ...token, usedAt: null });
    });
  }

  async findUsableByHash(
    tokenHash: string,
    type: AuthTokenType,
    now: Date,
  ): Promise<IAuthTokenRecord | null> {
    const model = await this.db.getRepository(AuthTokenModel).findOne({
      where: { tokenHash, type, usedAt: IsNull(), expiresAt: MoreThan(now) },
    });
    return model ? toRecord(model) : null;
  }

  async consume(id: string, now: Date): Promise<boolean> {
    // The WHERE clause is the check: Postgres row-locks the row for the UPDATE, so a
    // second simultaneous call finds used_at already set and updates nothing
    const result = await this.db
      .createQueryBuilder()
      .update(AuthTokenModel)
      .set({ usedAt: now })
      .where('id = :id AND used_at IS NULL AND expires_at > :now', { id, now })
      .execute();
    return result.affected === 1;
  }

  async findUnusedByType(type: AuthTokenType): Promise<IAuthTokenRecord[]> {
    const models = await this.db.getRepository(AuthTokenModel).find({
      where: { type, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return models.map(toRecord);
  }
}
