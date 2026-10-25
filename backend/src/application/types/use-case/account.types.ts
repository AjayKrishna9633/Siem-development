import type { IActor } from './company.types.ts';

// Where the code went, so the UI can say "We sent a code to j***@gmail.com"
export interface ICodeSentResponse {
  sentTo: string;
  expiresInMinutes: number;
}

export interface IRequestPasswordChangeInput {
  actor: IActor;
}

export interface IChangePasswordInput {
  actor: IActor;
  code: string;
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
