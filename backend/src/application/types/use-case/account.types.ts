import type { IActor } from './actor.types.ts';
import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';

// Where the code went, so the UI can say "We sent a code to j***@gmail.com"
export interface ICodeSentResponse {
  sentTo: string;
  expiresInMinutes: number;
}

export interface IChangePasswordInput {
  actor: IActor;
  currentPassword: string;
  newPassword: string;
  context: IRequestContext;
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
