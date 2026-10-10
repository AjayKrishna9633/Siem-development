import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.js';
import type { Request, Response } from 'express';
import { catchAsync } from '../middleware/catch-async.js';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.js';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.js';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.js';
import type { ISendOtpUseCase } from '../../application/interfaces/use-cases/send-otp.interface.js';

@injectable()
export class AuthController {
  constructor(@inject(TYPES.SendOtpUseCase) private readonly sendOtpUseCase: ISendOtpUseCase) {}

  sendOtp = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.sendOtpUseCase.execute(req.body);

    res.status(HttpStatusCode.OK).json(
      new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.OTP_SENT)
    );
  });
}
