import type { IEmailSettings } from '../../../domain/types/email-settings.types.ts';

export interface IEmailSettingsRepository {
  get(): Promise<IEmailSettings>;
  save(settings: IEmailSettings): Promise<void>;
}
