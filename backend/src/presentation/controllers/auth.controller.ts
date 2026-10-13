import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import type { ISendOtpUseCase } from '../../application/interfaces/use-cases/send-otp.interface.ts';
import type { IVerifyOtpUseCase } from '../../application/interfaces/use-cases/verify-otp.interface.ts';
import type { ILoginUseCase } from '../../application/interfaces/use-cases/login.interface.ts';

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.SendOtpUseCase) private readonly sendOtpUseCase: ISendOtpUseCase,
    @inject(TYPES.VerifyOtpUseCase) private readonly verifyOtpUseCase: IVerifyOtpUseCase,
    @inject(TYPES.LoginUseCase) private readonly loginUseCase: ILoginUseCase,
  ) {}

  sendOtp = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.sendOtpUseCase.execute(req.body);

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.OTP_SENT));
  });

  verifyOtp = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.verifyOtpUseCase.execute(req.body);

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, { verified: true }, SuccessMessage.OTP_VERIFIED));
  });

  login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const forwardedHeader = req.headers['x-forwarded-for'];
    const ip =
      typeof forwardedHeader === 'string'
        ? (forwardedHeader.split(',')[0]?.trim() ?? req.ip ?? null)
        : (req.ip ?? null);

    const result = await this.loginUseCase.execute({
      ...req.body,
      ip,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.LOGIN_SUCCESSFUL));
  });
}
