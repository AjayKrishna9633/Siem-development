import { injectable, inject } from 'inversify';
import { IsNull, type DataSource } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type {
  IActiveIngestKey,
  IIngestKeyRecord,
  IIngestKeyRepository,
  INewIngestKey,
} from '../../../application/interfaces/repositories/ingest-key.repository.interface.ts';
import { IngestKeyModel } from '../models/ingest-key.model.ts';

interface IRevokedRow {
  id: string;
  name: string;
  key_prefix: string;
  created_by: string | null;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
  revoked_by: string | null;
}

const toRecord = (model: IngestKeyModel): IIngestKeyRecord => ({
  id: model.id,
  name: model.name,
  keyPrefix: model.keyPrefix,
  createdBy: model.createdBy,
  createdAt: model.createdAt,
  lastUsedAt: model.lastUsedAt,
  revokedAt: model.revokedAt,
  revokedBy: model.revokedBy,
});

@injectable()
export class TypeOrmIngestKeyRepository implements IIngestKeyRepository {
  constructor(@inject(TYPES.DataSource) private readonly _db: DataSource) {}

  private get _repo() {
    return this._db.getRepository(IngestKeyModel);
  }

  async create(key: INewIngestKey): Promise<IIngestKeyRecord> {
    const saved = await this._repo.save(
      this._repo.create({ ...key, lastUsedAt: null, revokedAt: null, revokedBy: null }),
    );
    return toRecord(saved);
  }

  async findAll(): Promise<IIngestKeyRecord[]> {
    const models = await this._repo.find({ order: { createdAt: 'DESC' } });
    return models.map(toRecord);
  }

  async findActiveByName(name: string): Promise<IIngestKeyRecord | null> {
    const model = await this._repo.findOne({ where: { name, revokedAt: IsNull() } });
    return model ? toRecord(model) : null;
  }

  async findActiveByHash(keyHash: string): Promise<IActiveIngestKey | null> {
    const model = await this._repo.findOne({
      select: { id: true, name: true, lastUsedAt: true },
      where: { keyHash, revokedAt: IsNull() },
    });
    return model ? { id: model.id, name: model.name, lastUsedAt: model.lastUsedAt } : null;
  }

  async touchLastUsed(id: string, now: Date): Promise<void> {
    await this._repo.update({ id }, { lastUsedAt: now });
  }

  countActive(): Promise<number> {
    return this._repo.count({ where: { revokedAt: IsNull() } });
  }

  async revoke(id: string, revokedBy: string | null, now: Date): Promise<IIngestKeyRecord | null> {
    // One statement, so two admins revoking at once can't both "succeed".
    const result = await this._db
      .createQueryBuilder()
      .update(IngestKeyModel)
      .set({ revokedAt: now, revokedBy })
      .where('id = :id AND revoked_at IS NULL', { id })
      .returning('*')
      .execute();
    // RETURNING gives raw column names, not the model's property names.
    const [row] = result.raw as IRevokedRow[];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      keyPrefix: row.key_prefix,
      createdBy: row.created_by,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
    };
  }
}
