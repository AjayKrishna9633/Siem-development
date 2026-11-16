import type { IActor } from '../../../types/use-case/actor.types.ts';

export interface IChangePasswordInput {
  actor: IActor;
  currentPassword: string;
  newPassword: string;
}

export interface IRequestEmailChangeInput {
  actor: IActor;
  newEmail: string;
  currentPassword: string;
}

export interface IChangeEmailInput {
  actor: IActor;
  code: string;
}
