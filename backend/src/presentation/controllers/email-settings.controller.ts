import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { actorFrom } from '../http/actor.ts';
import { testEmailSchema, updateEmailSettingsSchema } from '../validators/email-settings.schema.ts';
import { toEmailSettingsDto } from '../../application/dtos/email-settings/response/email-settings-response.dto.ts';
import type {
  IDisableEmailSettingsUseCase,
  IGetEmailSettingsUseCase,
  ITestEmailSettingsUseCase,
  IUpdateEmailSettingsUseCase,
} from '../../application/interfaces/use-cases/email-settings.interface.ts';

@injectable()
export class EmailSettingsController {
  constructor(
    @inject(TYPES.GetEmailSettingsUseCase) private readonly _get: IGetEmailSettingsUseCase,
    @inject(TYPES.UpdateEmailSettingsUseCase) private readonly _update: IUpdateEmailSettingsUseCase,
    @inject(TYPES.TestEmailSettingsUseCase) private readonly _test: ITestEmailSettingsUseCase,
    @inject(TYPES.DisableEmailSettingsUseCase)
    private readonly _disable: IDisableEmailSettingsUseCase,
  ) {}

  get = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const view = await this._get.execute({ actor: actorFrom(req) });
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toEmailSettingsDto(view),
          SuccessMessage.EMAIL_SETTINGS_FETCHED,
        ),
      );
  });

  update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { password, ...settings } = updateEmailSettingsSchema.parse(req.body);
    const view = await this._update.execute({ actor: actorFrom(req), ...settings, password });
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toEmailSettingsDto(view),
          SuccessMessage.EMAIL_SETTINGS_SAVED,
        ),
      );
  });

  test = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { to } = testEmailSchema.parse(req.body ?? {});
    const result = await this._test.execute({ actor: actorFrom(req), to });
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.EMAIL_TEST_FINISHED));
  });

  disable = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const view = await this._disable.execute({ actor: actorFrom(req) });
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toEmailSettingsDto(view),
          SuccessMessage.EMAIL_SETTINGS_DISABLED,
        ),
      );
  });
}
