import type {
  IIssueResetLinkInput,
  IPasswordResetPreview,
  IRecoveryLink,
  IRequestPasswordResetInput,
  IResetLinkDelivery,
  IResetPasswordInput,
} from '../../types/use-case/password-reset.types.ts';

// "Forgot password" on the sign-in page; answers the same whatever happens
export interface IRequestPasswordResetUseCase {
  execute(input: IRequestPasswordResetInput): Promise<void>;
}

export interface IGetPasswordResetUseCase {
  execute(input: { token: string }): Promise<IPasswordResetPreview>;
}

export interface IResetPasswordUseCase {
  execute(input: IResetPasswordInput): Promise<void>;
}

// An admin sends (or, without email, hands over) a reset link for someone else
export interface IIssueResetLinkUseCase {
  execute(input: IIssueResetLinkInput): Promise<IResetLinkDelivery>;
}

// `npm run reset-admin`: lockout recovery from the server's terminal
export interface ICreateRecoveryLinkUseCase {
  execute(input: { email: string }): Promise<IRecoveryLink>;
}
