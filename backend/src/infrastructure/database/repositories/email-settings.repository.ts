import { injectable, inject } from 'inversify';
import type { DataSource } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type { IEmailSettingsRepository } from '../../../application/interfaces/repositories/email-settings.repository.interface.ts';
import type { IEmailSettings } from '../../../domain/types/email-settings.types.ts';
import { EMAIL_SETTINGS_ROW_ID, EmailSettingsModel } from '../models/email-settings.model.ts';
import { toEmailSettings, toEmailSettingsRow } from '../mappers/email-settings.mapper.ts';

@injectable()
export class TypeOrmEmailSettingsRepository implements IEmailSettingsRepository {
  constructor(@inject(TYPES.DataSource) private readonly _db: DataSource) {}

  async get(): Promise<IEmailSettings> {
    const row = await this._db
      .getRepository(EmailSettingsModel)
      .findOneBy({ id: EMAIL_SETTINGS_ROW_ID });
    if (!row) throw new Error('The email_settings row is missing. Run the database migrations.');
    return toEmailSettings(row);
  }

  async save(settings: IEmailSettings): Promise<void> {
    await this._db.getRepository(EmailSettingsModel).save(toEmailSettingsRow(settings));
  }
}
