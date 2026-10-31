import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { actorFrom, idParamFrom } from '../http/actor.ts';
import { requestContextFrom } from '../http/request-context.ts';
import type {
  IAddUserUseCase,
  IChangeUserRoleUseCase,
  ISetUserStatusUseCase,
  IListUsersUseCase,
} from '../../application/interfaces/use-cases/users.interface.ts';
import type { IResendActivationUseCase } from '../../application/interfaces/use-cases/activation.interface.ts';

@injectable()
export class UsersController {
  constructor(
    @inject(TYPES.AddUserUseCase) private readonly addUser: IAddUserUseCase,
    @inject(TYPES.ListUsersUseCase)
    private readonly listUsers: IListUsersUseCase,
    @inject(TYPES.ChangeUserRoleUseCase) private readonly changeUserRole: IChangeUserRoleUseCase,
    @inject(TYPES.SetUserStatusUseCase) private readonly setUserStatus: ISetUserStatusUseCase,
    @inject(TYPES.ResendActivationUseCase)
    private readonly resendActivation: IResendActivationUseCase,
  ) {}

  list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.listUsers.execute({ actor: actorFrom(req) });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.USERS_FETCHED));
  });

  add = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.addUser.execute({
      actor: actorFrom(req),
      role: req.body.role,
      username: req.body.username,
      email: req.body.email,
    });

    res
      .status(HttpStatusCode.CREATED)
      .json(new ApiResponse(HttpStatusCode.CREATED, result, SuccessMessage.USER_ADDED));
  });

  resendActivationFor = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.resendActivation.execute({
      actor: actorFrom(req),
      userId: idParamFrom(req, 'userId'),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.ACTIVATION_ISSUED));
  });

  changeRole = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.changeUserRole.execute({
      actor: actorFrom(req),
      userId: idParamFrom(req, 'userId'),
      role: req.body.role,
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.USER_ROLE_CHANGED));
  });

  disable = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.respondWithStatus(req, res, false);
  });

  enable = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.respondWithStatus(req, res, true);
  });

  private async respondWithStatus(req: Request, res: Response, enabled: boolean): Promise<void> {
    const result = await this.setUserStatus.execute({
      actor: actorFrom(req),
      userId: idParamFrom(req, 'userId'),
      enabled,
      context: requestContextFrom(req),
    });
    const message = enabled ? SuccessMessage.USER_ENABLED : SuccessMessage.USER_DISABLED;
    res.status(HttpStatusCode.OK).json(new ApiResponse(HttpStatusCode.OK, result, message));
  }
}
