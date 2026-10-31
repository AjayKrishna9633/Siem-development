import type { SystemSettings } from '../../../domain/entities/system-settings.entity.ts';
import type { User } from '../../../domain/entities/user.entity.ts';

export interface ISystemSettingsRepository {
  get(): Promise<SystemSettings>;
  save(settings: SystemSettings): Promise<void>;
  // One transaction: locks the settings row, passes it to `decide`, then saves the
  // settings and inserts the admin `decide` returns. Concurrent calls queue on the lock,
  // so the second one sees setup already completed. A throw rolls everything back.
  completeSetup(decide: (locked: SystemSettings) => User): Promise<User>;
}
