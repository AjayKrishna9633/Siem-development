import type {
  ICompleteSetupInput,
  IIssueSetupTokenInput,
  IVerifySetupTokenInput,
} from '../../dtos/setup/request/setup-request.dto.ts';
import type { IssueSetupTokenResult } from '../../types/use-case/setup.types.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';

export interface IIssueSetupTokenUseCase {
  execute(input: IIssueSetupTokenInput): Promise<IssueSetupTokenResult>;
}

export interface IGetSetupStatusUseCase {
  execute(): Promise<{ completed: boolean }>;
}

export interface IVerifySetupTokenUseCase {
  execute(input: IVerifySetupTokenInput): Promise<void>;
}

export interface ICompleteSetupUseCase {
  execute(input: ICompleteSetupInput): Promise<ILoginResponse>;
}
