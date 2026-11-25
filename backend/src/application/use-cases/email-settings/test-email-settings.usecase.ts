import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IEmailSettingsRepository } from '../../interfaces/repositories/email-settings.repository.interface.ts';
import type { IMailTransportProvider } from '../../interfaces/services/mail-transport.provider.interface.ts';
import type { IEmailTester } from '../../interfaces/services/email-tester.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ITestEmailSettingsUseCase } from '../../interfaces/use-cases/email-settings.interface.ts';
import type { ITestEmailSettingsInput } from '../../dtos/email-settings/request/email-settings-request.dto.ts';
import type { IEmailTestResult } from '../../types/use-case/email-settings.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { LAST_TEST_ERROR_MAX } from '../../../domain/constants/email.ts';
import { assertPermission } from '../shared/access.ts';

@injectable()
export class TestEmailSettingsUseCase implements ITestEmailSettingsUseCase {
  constructor(
    @inject(TYPES.EmailSettingsRepository) private readonly _settings: IEmailSettingsRepository,
    @inject(TYPES.MailTransportProvider) private readonly _transports: IMailTransportProvider,
    @inject(TYPES.EmailTester) private readonly _tester: IEmailTester,
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  async execute(input: ITestEmailSettingsInput): Promise<IEmailTestResult> {
    assertPermission(input.actor, Permission.SETTINGS_MANAGE);
    const transport = await this._transports.current();
    if (!transport) {
      throw new AppError(AppErrorCode.EMAIL_NOT_CONFIGURED, ErrorMessage.EMAIL_NOT_CONFIGURED);
    }

    const to = input.to ?? (await this._users.findById(input.actor.userId))?.email;
    if (!to) throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);

    const result = await this._tester.send(transport, to);

    const settings = await this._settings.get();
    await this._settings.save({
      ...settings,
      lastTestAt: new Date(),
      lastTestOk: result.ok,
      lastTestError: result.ok ? null : result.message.slice(0, LAST_TEST_ERROR_MAX),
    });
    await this._audit.record({
      action: AuditAction.EMAIL_TEST_SENT,
      outcome: result.ok ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      targetType: AuditTargetType.SYSTEM_SETTINGS,
      targetLabel: 'email',
      metadata: {
        source: transport.source,
        to,
        ...(!result.ok && { category: result.category, responseCode: result.responseCode }),
      },
    });
    return result;
  }
}
