import type { IRequestContext } from '../../../interfaces/services/request-context.provider.interface.ts';

export interface IIssueSetupTokenInput {
  replaceExisting: boolean;
}

export interface IVerifySetupTokenInput {
  token: string;
}

export interface ICompleteSetupInput {
  token: string;
  adminName: string;
  email: string;
  password: string;
  orgName: string;
  baseUrl: string;
  context: IRequestContext;
}
