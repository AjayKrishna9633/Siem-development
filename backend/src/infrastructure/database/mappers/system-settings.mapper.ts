import { injectable } from 'inversify';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import { SystemSettings } from '../../../domain/entities/system-settings.entity.ts';
import { SystemSettingsModel } from '../models/system-settings.model.ts';

export const SETTINGS_ROW_ID = 1;

@injectable()
export class SystemSettingsMapper implements IMapper<SystemSettings, SystemSettingsModel> {
  toDomain(model: SystemSettingsModel): SystemSettings {
    return SystemSettings.reconstitute({
      setupCompleted: model.setupCompleted,
      setupTokenHash: model.setupTokenHash,
      setupTokenExpiresAt: model.setupTokenExpiresAt,
      orgName: model.orgName,
      baseUrl: model.baseUrl,
      timezone: model.timezone,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  toPersistence(entity: SystemSettings): SystemSettingsModel {
    const model = new SystemSettingsModel();
    Object.assign(model, entity.toSnapshot(), { id: SETTINGS_ROW_ID });
    return model;
  }
}
