import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.js';
import type { Request, Response } from 'express';
import type { RegisterSuperAdminUseCase } from '../../application/use-cases/admin/create-super-admin.usecase.js';
import { catchAsync } from '../middleware/catch-async.js';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.js';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.js';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.js';
import type { IRegisterSuperAdminUseCase } from '../../application/interfaces/use-cases/register-super-admin.interface.js';

@injectable()
export class AdminController {
  constructor(@inject(TYPES.RegisterSuperAdminUseCase) private readonly registerSuperAdmin: IRegisterSuperAdminUseCase) {}

  createSuperAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {

    const result = await this.registerSuperAdmin.execute(req.body);

    res.status(HttpStatusCode.CREATED).json(
      new ApiResponse(HttpStatusCode.CREATED, result, SuccessMessage.SUPER_ADMIN_CREATED)
    );
  });
}