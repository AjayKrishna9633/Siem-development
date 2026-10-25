import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import type { ISendOtpUseCase } from '../../application/interfaces/use-cases/send-otp.interface.ts';
import type { IVerifyOtpUseCase } from '../../application/interfaces/use-cases/verify-otp.interface.ts';
import type { IResetPasswordUseCase } from '../../application/interfaces/use-cases/reset-password.interface.ts';

// Forgot password, for someone who is signed out: email a code, verify it, set a new password
@injectable()
export class PasswordResetController {
  constructor(
    @inject(TYPES.SendOtpUseCase) private readonly sendOtpUseCase: ISendOtpUseCase,
    @inject(TYPES.VerifyOtpUseCase) private readonly verifyOtpUseCase: IVerifyOtpUseCase,
    @inject(TYPES.ResetPasswordUseCase)
    private readonly resetPasswordUseCase: IResetPasswordUseCase,
  ) {}

  sendOtp = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.sendOtpUseCase.execute({ email: req.body.email, type: req.body.type });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.OTP_SENT));
  });

  verifyOtp = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.verifyOtpUseCase.execute({
      email: req.body.email,
      otp: req.body.otp,
      type: req.body.type,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.OTP_VERIFIED));
  });

  resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.resetPasswordUseCase.execute({
      email: req.body.email,
      resetToken: req.body.resetToken,
      newPassword: req.body.newPassword,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.PASSWORD_RESET_SUCCESSFUL));
  });
}
