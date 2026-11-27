import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { actorFrom } from '../http/actor.ts';
import {
  enrollCommandBodySchema,
  enrollmentCheckQuerySchema,
  enrollmentLinkBodySchema,
  enrollmentLinkParamsSchema,
} from '../validators/agents.schema.ts';
import {
  toAgentDto,
  toCreatedEnrollmentLinkDto,
  toEnrollCommandDto,
  toEnrollmentCheckDto,
  toEnrollmentLinkDto,
} from '../../application/dtos/agent/response/agent-response.dto.ts';
import type {
  ICheckEnrollmentUseCase,
  ICreateEnrollmentLinkUseCase,
  IGenerateEnrollCommandUseCase,
  IListAgentGroupsUseCase,
  IListAgentsUseCase,
  IListEnrollmentLinksUseCase,
  IRevokeEnrollmentLinkUseCase,
} from '../../application/interfaces/use-cases/agents.interface.ts';

@injectable()
export class AgentsController {
  constructor(
    @inject(TYPES.ListAgentsUseCase) private readonly _agents: IListAgentsUseCase,
    @inject(TYPES.ListAgentGroupsUseCase) private readonly _groups: IListAgentGroupsUseCase,
    @inject(TYPES.GenerateEnrollCommandUseCase)
    private readonly _enrollCommand: IGenerateEnrollCommandUseCase,
    @inject(TYPES.CheckEnrollmentUseCase)
    private readonly _checkEnrollment: ICheckEnrollmentUseCase,
    @inject(TYPES.CreateEnrollmentLinkUseCase)
    private readonly _createLink: ICreateEnrollmentLinkUseCase,
    @inject(TYPES.ListEnrollmentLinksUseCase)
    private readonly _listLinks: IListEnrollmentLinksUseCase,
    @inject(TYPES.RevokeEnrollmentLinkUseCase)
    private readonly _revokeLink: IRevokeEnrollmentLinkUseCase,
  ) {}

  list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const agents = await this._agents.execute({ actor: actorFrom(req) });
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(HttpStatusCode.OK, agents.map(toAgentDto), SuccessMessage.AGENTS_FETCHED),
      );
  });

  groups = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const groups = await this._groups.execute({ actor: actorFrom(req) });
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, groups, SuccessMessage.AGENT_GROUPS_FETCHED));
  });

  enrollCommand = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { os, arch, group, agentName } = enrollCommandBodySchema.parse(req.body);
    const result = await this._enrollCommand.execute({
      actor: actorFrom(req),
      os,
      group,
      ...(arch !== undefined && { arch }),
      ...(agentName !== undefined && { agentName }),
    });
    // The response carries the enrollment secret: no browser or proxy may keep a copy.
    res
      .set('Cache-Control', 'no-store')
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toEnrollCommandDto(result),
          SuccessMessage.ENROLL_COMMAND_GENERATED,
        ),
      );
  });

  enrollmentCheck = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { agentName, since } = enrollmentCheckQuerySchema.parse(req.query);
    const result = await this._checkEnrollment.execute({
      actor: actorFrom(req),
      since,
      ...(agentName !== undefined && { agentName }),
    });
    res
      .set('Cache-Control', 'no-store')
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toEnrollmentCheckDto(result),
          SuccessMessage.ENROLLMENT_CHECKED,
        ),
      );
  });

  createEnrollmentLink = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { os, arch, group, agentName } = enrollmentLinkBodySchema.parse(req.body);
    const link = await this._createLink.execute({
      actor: actorFrom(req),
      os,
      group,
      agentName,
      ...(arch !== undefined && { arch }),
    });
    // The URL is the only copy of the token: no browser or proxy may keep it.
    res
      .set('Cache-Control', 'no-store')
      .status(HttpStatusCode.CREATED)
      .json(
        new ApiResponse(
          HttpStatusCode.CREATED,
          toCreatedEnrollmentLinkDto(link),
          SuccessMessage.ENROLLMENT_LINK_CREATED,
        ),
      );
  });

  listEnrollmentLinks = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const links = await this._listLinks.execute({ actor: actorFrom(req) });
    res
      .set('Cache-Control', 'no-store')
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          links.map(toEnrollmentLinkDto),
          SuccessMessage.ENROLLMENT_LINKS_FETCHED,
        ),
      );
  });

  revokeEnrollmentLink = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = enrollmentLinkParamsSchema.parse(req.params);
    await this._revokeLink.execute({ actor: actorFrom(req), id });
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.ENROLLMENT_LINK_REVOKED));
  });
}
