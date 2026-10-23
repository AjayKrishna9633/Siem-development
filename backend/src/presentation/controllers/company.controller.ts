import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { actorFrom, paramFrom } from '../http/actor.ts';
import type {
  ICreateCompanyUseCase,
  IListCompaniesUseCase,
  IReplaceCompanyAdminUseCase,
  ISetCompanyStatusUseCase,
  IUpdateCompanyUseCase,
} from '../../application/interfaces/use-cases/company.interface.ts';
import type { IResendActivationUseCase } from '../../application/interfaces/use-cases/activation.interface.ts';
import type { ICompanyRepository } from '../../application/interfaces/repositories/company.repository.interface.ts';
import { loadCompany } from '../../application/use-cases/shared/access.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

@injectable()
export class CompanyController {
  constructor(
    @inject(TYPES.CreateCompanyUseCase) private readonly createCompany: ICreateCompanyUseCase,
    @inject(TYPES.ListCompaniesUseCase) private readonly listCompanies: IListCompaniesUseCase,
    @inject(TYPES.UpdateCompanyUseCase) private readonly updateCompany: IUpdateCompanyUseCase,
    @inject(TYPES.SetCompanyStatusUseCase)
    private readonly setCompanyStatus: ISetCompanyStatusUseCase,
    @inject(TYPES.ReplaceCompanyAdminUseCase)
    private readonly replaceCompanyAdmin: IReplaceCompanyAdminUseCase,
    @inject(TYPES.ResendActivationUseCase)
    private readonly resendActivation: IResendActivationUseCase,
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
  ) {}

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.createCompany.execute({ actor: actorFrom(req), ...req.body });

    res
      .status(HttpStatusCode.CREATED)
      .json(new ApiResponse(HttpStatusCode.CREATED, result, SuccessMessage.COMPANY_CREATED));
  });

  list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.listCompanies.execute({ actor: actorFrom(req) });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANIES_FETCHED));
  });

  update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.updateCompany.execute({
      actor: actorFrom(req),
      companyId: paramFrom(req, 'companyId'),
      name: req.body.name,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_UPDATED));
  });

  deactivate = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.setCompanyStatus.execute({
      actor: actorFrom(req),
      companyId: paramFrom(req, 'companyId'),
      active: false,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_UPDATED));
  });

  reactivate = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.setCompanyStatus.execute({
      actor: actorFrom(req),
      companyId: paramFrom(req, 'companyId'),
      active: true,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_UPDATED));
  });

  replaceAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.replaceCompanyAdmin.execute({
      actor: actorFrom(req),
      companyId: paramFrom(req, 'companyId'),
      adminName: req.body.adminName,
      adminEmail: req.body.adminEmail,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_ADMIN_REPLACED));
  });

  resendAdminActivation = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const company = await loadCompany(this.companies, paramFrom(req, 'companyId'));
    if (!company.adminUserId) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    const result = await this.resendActivation.execute({
      actor: actorFrom(req),
      userId: company.adminUserId,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.ACTIVATION_ISSUED));
  });
}
