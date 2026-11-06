import { injectable, inject } from 'inversify';
import type { DataSource, EntityManager } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type { ISystemSettingsRepository } from '../../../application/interfaces/repositories/system-settings.repository.interface.ts';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import type { SystemSettings } from '../../../domain/entities/system-settings.entity.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { SystemSettingsModel } from '../models/system-settings.model.ts';
import { UserModel } from '../models/user.model.ts';
import { SETTINGS_ROW_ID } from '../mappers/system-settings.mapper.ts';

@injectable()
export class TypeOrmSystemSettingsRepository implements ISystemSettingsRepository {
  constructor(
    @inject(TYPES.DataSource) private readonly db: DataSource,
    @inject(TYPES.SystemSettingsMapper)
    private readonly mapper: IMapper<SystemSettings, SystemSettingsModel>,
  ) {}

  async get(): Promise<SystemSettings> {
    return this.mapper.toDomain(await this.loadRow(this.db.manager));
  }

  async save(settings: SystemSettings): Promise<void> {
    await this.db.getRepository(SystemSettingsModel).save(this.mapper.toPersistence(settings));
  }

  completeSetup(decide: (locked: SystemSettings) => User): Promise<User> {
    return this.db.transaction(async (manager) => {
      const settings = this.mapper.toDomain(await this.loadRow(manager, true));
      const admin = decide(settings);

      await manager.insert(UserModel, admin.toSnapshot());
      await manager.save(SystemSettingsModel, this.mapper.toPersistence(settings));
      return admin;
    });
  }

  private async loadRow(manager: EntityManager, lock = false): Promise<SystemSettingsModel> {
    const row = await manager.findOne(SystemSettingsModel, {
      where: { id: SETTINGS_ROW_ID },
      ...(lock && { lock: { mode: 'pessimistic_write' as const } }),
    });
    if (!row) throw new Error('The system_settings row is missing. Run the database migrations.');
    return row;
  }
}
