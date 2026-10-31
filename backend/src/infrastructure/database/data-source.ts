import { DataSource } from 'typeorm';
import { env } from '../../config/env.config.ts';
import { UserModel } from './models/user.model.ts';
import { AuditLogModel } from './models/audit-log.model.ts';
import { SystemSettingsModel } from './models/system-settings.model.ts';
import { Baseline1793404800000 } from './migrations/1793404800000-Baseline.ts';
import { RemoveTenancy1793491200000 } from './migrations/1793491200000-RemoveTenancy.ts';
import { CreateAuditLogs1793577600000 } from './migrations/1793577600000-CreateAuditLogs.ts';
import { CreateSystemSettings1793664000000 } from './migrations/1793664000000-CreateSystemSettings.ts';

// The schema only ever changes through migrations, never `synchronize`, so every
// customer install and every upgrade ends up with exactly the same tables.
// Migrations are listed explicitly (not a glob) so the same list works under tsx and
// from the compiled dist/ folder.
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false,
  logging: false, // <-- set this to false to hide query lines
  entities: [UserModel, AuditLogModel, SystemSettingsModel],
  migrations: [
    Baseline1793404800000,
    RemoveTenancy1793491200000,
    CreateAuditLogs1793577600000,
    CreateSystemSettings1793664000000,
  ],
});
