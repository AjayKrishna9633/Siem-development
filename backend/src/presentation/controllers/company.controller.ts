import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { actorFrom, idParamFrom } from '../http/actor.ts';
import type {
  ICreateCompanyUseCase,
  IListCompaniesUseCase,
  IReplaceCompanyAdminUseCase,
  IResendAdminActivationUseCase,
  ISetCompanyStatusUseCase,
  IUpdateCompanyUseCase,
} from '../../application/interfaces/use-cases/company.interface.ts';

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
    @inject(TYPES.ResendAdminActivationUseCase)
    private readonly resendAdminActivationUseCase: IResendAdminActivationUseCase,
  ) {}

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // Fields are listed explicitly so nothing in the body can replace `actor`
    const result = await this.createCompany.execute({
      actor: actorFrom(req),
      name: req.body.name,
      adminName: req.body.adminName,
      adminEmail: req.body.adminEmail,
    });

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
      companyId: idParamFrom(req, 'companyId'),
      name: req.body.name,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_UPDATED));
  });

  deactivate = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.setCompanyStatus.execute({
      actor: actorFrom(req),
      companyId: idParamFrom(req, 'companyId'),
      active: false,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_UPDATED));
  });

  reactivate = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.setCompanyStatus.execute({
      actor: actorFrom(req),
      companyId: idParamFrom(req, 'companyId'),
      active: true,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_UPDATED));
  });

  replaceAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.replaceCompanyAdmin.execute({
      actor: actorFrom(req),
      companyId: idParamFrom(req, 'companyId'),
      adminName: req.body.adminName,
      adminEmail: req.body.adminEmail,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.COMPANY_ADMIN_REPLACED));
  });

  resendAdminActivation = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.resendAdminActivationUseCase.execute({
      actor: actorFrom(req),
      companyId: idParamFrom(req, 'companyId'),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.ACTIVATION_ISSUED));
  });
}
