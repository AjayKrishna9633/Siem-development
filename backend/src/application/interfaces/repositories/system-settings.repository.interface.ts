import type { SystemSettings } from '../../../domain/entities/system-settings.entity.ts';
import type { User } from '../../../domain/entities/user.entity.ts';

export interface ISystemSettingsRepository {
  get(): Promise<SystemSettings>;
  save(settings: SystemSettings): Promise<void>;
  completeSetup(decide: (locked: SystemSettings) => User): Promise<User>;
}
