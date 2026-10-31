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
  IChangeUserRoleUseCase,
  ISetUserStatusUseCase,
  IListUsersUseCase,
} from '../../application/interfaces/use-cases/users.interface.ts';
import type {
  IInviteUserUseCase,
  IListPendingInvitesUseCase,
  IResendInviteUseCase,
  IRevokeInviteUseCase,
} from '../../application/interfaces/use-cases/invites.interface.ts';
import type { IIssueResetLinkUseCase } from '../../application/interfaces/use-cases/password-reset.interface.ts';

@injectable()
export class UsersController {
  constructor(
    @inject(TYPES.ListUsersUseCase)
    private readonly listUsers: IListUsersUseCase,
    @inject(TYPES.ChangeUserRoleUseCase) private readonly changeUserRole: IChangeUserRoleUseCase,
    @inject(TYPES.SetUserStatusUseCase) private readonly setUserStatus: ISetUserStatusUseCase,
    @inject(TYPES.InviteUserUseCase) private readonly inviteUser: IInviteUserUseCase,
    @inject(TYPES.ResendInviteUseCase) private readonly resendInviteUseCase: IResendInviteUseCase,
    @inject(TYPES.RevokeInviteUseCase) private readonly revokeInviteUseCase: IRevokeInviteUseCase,
    @inject(TYPES.IssueResetLinkUseCase)
    private readonly issueResetLinkUseCase: IIssueResetLinkUseCase,
    @inject(TYPES.ListPendingInvitesUseCase)
    private readonly listPendingInvites: IListPendingInvitesUseCase,
  ) {}

  list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.listUsers.execute({ actor: actorFrom(req) });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.USERS_FETCHED));
  });

  listInvites = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.listPendingInvites.execute({ actor: actorFrom(req) });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.INVITES_FETCHED));
  });

  invite = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.inviteUser.execute({
      actor: actorFrom(req),
      email: req.body.email,
      role: req.body.role,
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.CREATED)
      .json(new ApiResponse(HttpStatusCode.CREATED, result, SuccessMessage.INVITE_CREATED));
  });

  resendInvite = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.resendInviteUseCase.execute({
      actor: actorFrom(req),
      userId: idParamFrom(req, 'userId'),
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.INVITE_RESENT));
  });

  revokeInvite = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.revokeInviteUseCase.execute({
      actor: actorFrom(req),
      userId: idParamFrom(req, 'userId'),
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.INVITE_REVOKED));
  });

  issueResetLink = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.issueResetLinkUseCase.execute({
      actor: actorFrom(req),
      userId: idParamFrom(req, 'userId'),
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.RESET_LINK_ISSUED));
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
