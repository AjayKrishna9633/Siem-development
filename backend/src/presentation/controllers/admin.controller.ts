import type { Request, Response } from 'express';
import type { RegisterSuperAdminUseCase } from '../../application/use-case/admin/create-super-admin.usecase.js';
import { catchAsync } from '../middleware/catch-async.js';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.js';

export class AdminController {
  constructor(private readonly registerSuperAdmin: RegisterSuperAdminUseCase) {}

  createSuperAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    
    const result = await this.registerSuperAdmin.execute(req.body);

    res.status(201).json(
      new ApiResponse(201, result, 'Super admin registered successfully')
    );
  });
}