import type {
  IIssueResetLinkInput,
  IPasswordResetPreview,
  IRecoveryLink,
  IRequestPasswordResetInput,
  IResetLinkDelivery,
  IResetPasswordInput,
} from '../../types/use-case/password-reset.types.ts';

export interface IRequestPasswordResetUseCase {
  execute(input: IRequestPasswordResetInput): Promise<void>;
}

export interface IGetPasswordResetUseCase {
  execute(input: { token: string }): Promise<IPasswordResetPreview>;
}

export interface IResetPasswordUseCase {
  execute(input: IResetPasswordInput): Promise<void>;
}

export interface IIssueResetLinkUseCase {
  execute(input: IIssueResetLinkInput): Promise<IResetLinkDelivery>;
}

export interface ICreateRecoveryLinkUseCase {
  execute(input: { email: string }): Promise<IRecoveryLink>;
}
