import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import type {
  IChangeEmailInput,
  IChangePasswordInput,
  ICodeSentResponse,
  IRequestEmailChangeInput,
  IRequestPasswordChangeInput,
} from '../../types/use-case/account.types.ts';

export interface IRequestPasswordChangeUseCase {
  execute(input: IRequestPasswordChangeInput): Promise<ICodeSentResponse>;
}

// Returns a fresh session: the change signs out every other device, but not this one
export interface IChangePasswordUseCase {
  execute(input: IChangePasswordInput): Promise<ILoginResponse>;
}

export interface IRequestEmailChangeUseCase {
  execute(input: IRequestEmailChangeInput): Promise<ICodeSentResponse>;
}

export interface IChangeEmailUseCase {
  execute(input: IChangeEmailInput): Promise<ILoginResponse>;
}
