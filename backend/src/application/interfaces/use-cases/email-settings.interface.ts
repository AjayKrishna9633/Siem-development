import type {
  IEmailSettingsActorInput,
  ITestEmailSettingsInput,
  IUpdateEmailSettingsInput,
} from '../../dtos/email-settings/request/email-settings-request.dto.ts';
import type {
  IEmailSettingsView,
  IEmailTestResult,
} from '../../types/use-case/email-settings.types.ts';

export interface IGetEmailSettingsUseCase {
  execute(input: IEmailSettingsActorInput): Promise<IEmailSettingsView>;
}

export interface IUpdateEmailSettingsUseCase {
  execute(input: IUpdateEmailSettingsInput): Promise<IEmailSettingsView>;
}

export interface ITestEmailSettingsUseCase {
  execute(input: ITestEmailSettingsInput): Promise<IEmailTestResult>;
}

export interface IDisableEmailSettingsUseCase {
  execute(input: IEmailSettingsActorInput): Promise<IEmailSettingsView>;
}
