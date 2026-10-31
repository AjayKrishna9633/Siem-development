import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IGetSetupStatusUseCase } from '../../interfaces/use-cases/setup.interface.ts';

@injectable()
export class GetSetupStatusUseCase implements IGetSetupStatusUseCase {
  constructor(
    @inject(TYPES.SystemSettingsRepository) private readonly settings: ISystemSettingsRepository,
  ) {}

  async execute(): Promise<{ completed: boolean }> {
    const settings = await this.settings.get();
    return { completed: settings.isSetupCompleted };
  }
}
