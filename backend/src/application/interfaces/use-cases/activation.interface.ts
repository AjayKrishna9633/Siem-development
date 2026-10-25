import type { IActivationGrant } from '../services/activation.service.interface.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import type {
  IActivateAccountInput,
  IActivationPreview,
  IResendActivationInput,
  IVerifiedActivation,
  IVerifyActivationInput,
} from '../../types/use-case/user-mgmt.types.ts';

export interface IGetActivationUseCase {
  execute(input: { activationId: string }): Promise<IActivationPreview>;
}

export interface IVerifyActivationUseCase {
  execute(input: IVerifyActivationInput): Promise<IVerifiedActivation>;
}

export interface IActivateAccountUseCase {
  execute(input: IActivateAccountInput): Promise<ILoginResponse>;
}

export interface IResendActivationUseCase {
  execute(input: IResendActivationInput): Promise<IActivationGrant>;
}
