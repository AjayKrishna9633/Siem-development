import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { actorFrom, idParamFrom } from '../http/actor.ts';
import type {
  IAddTeamMemberUseCase,
  IListTeamMembersUseCase,
} from '../../application/interfaces/use-cases/team.interface.ts';
import type { IResendActivationUseCase } from '../../application/interfaces/use-cases/activation.interface.ts';

@injectable()
export class TeamController {
  constructor(
    @inject(TYPES.AddTeamMemberUseCase) private readonly addTeamMember: IAddTeamMemberUseCase,
    @inject(TYPES.ListTeamMembersUseCase)
    private readonly listTeamMembers: IListTeamMembersUseCase,
    @inject(TYPES.ResendActivationUseCase)
    private readonly resendActivation: IResendActivationUseCase,
  ) {}

  list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.listTeamMembers.execute({ actor: actorFrom(req) });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.USERS_FETCHED));
  });

  add = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.addTeamMember.execute({
      actor: actorFrom(req),
      role: req.body.role,
      username: req.body.username,
      email: req.body.email,
    });

    res
      .status(HttpStatusCode.CREATED)
      .json(new ApiResponse(HttpStatusCode.CREATED, result, SuccessMessage.TEAM_MEMBER_ADDED));
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
}
