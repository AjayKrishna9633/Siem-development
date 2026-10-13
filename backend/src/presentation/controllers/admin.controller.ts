import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import type { IRegisterSuperAdminUseCase } from '../../application/interfaces/use-cases/register-super-admin.interface.ts';

@injectable()
export class AdminController {
  constructor(
    @inject(TYPES.RegisterSuperAdminUseCase)
    private readonly registerSuperAdmin: IRegisterSuperAdminUseCase,
  ) {}

  createSuperAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.registerSuperAdmin.execute(req.body);

    res
      .status(HttpStatusCode.CREATED)
      .json(new ApiResponse(HttpStatusCode.CREATED, result, SuccessMessage.SUPER_ADMIN_CREATED));
  });
}
