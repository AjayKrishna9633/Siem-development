import type {
  IIssueResetLinkInput,
  IRequestPasswordResetInput,
  IResetPasswordInput,
} from '../../dtos/password-reset/request/password-reset-request.dto.ts';
import type {
  IPasswordResetPreview,
  IRecoveryLink,
  IResetLinkDelivery,
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
