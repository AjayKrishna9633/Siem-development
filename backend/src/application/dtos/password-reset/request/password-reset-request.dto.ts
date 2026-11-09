import type { IActor } from '../../../types/use-case/actor.types.ts';
import type { IRequestContext } from '../../../interfaces/repositories/audit-log.repository.interface.ts';

export interface IRequestPasswordResetInput {
  email: string;
  context: IRequestContext;
}

export interface IResetPasswordInput {
  token: string;
  password: string;
  context: IRequestContext;
}

export interface IIssueResetLinkInput {
  actor: IActor;
  userId: string;
  context: IRequestContext;
}
