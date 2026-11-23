import { DataSource } from 'typeorm';
import { env } from '../../config/env.config.ts';
import { UserModel } from './models/user.model.ts';
import { AuditLogModel } from './models/audit-log.model.ts';
import { SystemSettingsModel } from './models/system-settings.model.ts';
import { AuthTokenModel } from './models/auth-token.model.ts';
import { EmailSettingsModel } from './models/email-settings.model.ts';
import { Baseline1793404800000 } from './migrations/1793404800000-Baseline.ts';
import { RemoveTenancy1793491200000 } from './migrations/1793491200000-RemoveTenancy.ts';
import { CreateAuditLogs1793577600000 } from './migrations/1793577600000-CreateAuditLogs.ts';
import { CreateSystemSettings1793664000000 } from './migrations/1793664000000-CreateSystemSettings.ts';
import { CreateAuthTokens1793750400000 } from './migrations/1793750400000-CreateAuthTokens.ts';
import { DropSettingsTimezone1793836800000 } from './migrations/1793836800000-DropSettingsTimezone.ts';
import { ExtendAuditLogs1793923200000 } from './migrations/1793923200000-ExtendAuditLogs.ts';
import { CreateIngestKeys1794009600000 } from './migrations/1794009600000-CreateIngestKeys.ts';
import { DropIngestKeys1794096000000 } from './migrations/1794096000000-DropIngestKeys.ts';
import { CreateEmailSettings1794268800000 } from './migrations/1794268800000-CreateEmailSettings.ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [UserModel, AuditLogModel, SystemSettingsModel, AuthTokenModel, EmailSettingsModel],
  migrations: [
    Baseline1793404800000,
    RemoveTenancy1793491200000,
    CreateAuditLogs1793577600000,
    CreateSystemSettings1793664000000,
    CreateAuthTokens1793750400000,
    DropSettingsTimezone1793836800000,
    ExtendAuditLogs1793923200000,
    CreateIngestKeys1794009600000,
    DropIngestKeys1794096000000,
    CreateEmailSettings1794268800000,
  ],
});
