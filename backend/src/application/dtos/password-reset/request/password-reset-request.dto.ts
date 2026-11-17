import type { IActor } from '../../../types/use-case/actor.types.ts';

export interface IRequestPasswordResetInput {
  email: string;
}

export interface IResetPasswordInput {
  token: string;
  password: string;
}

export interface IIssueResetLinkInput {
  actor: IActor;
  userId: string;
}
