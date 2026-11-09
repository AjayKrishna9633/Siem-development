import type { IRequestContext } from '../../../interfaces/repositories/audit-log.repository.interface.ts';

export interface IIssueSetupTokenInput {
  replaceExisting: boolean;
}

export interface IVerifySetupTokenInput {
  token: string;
  context: IRequestContext;
}

export interface ICompleteSetupInput {
  token: string;
  adminName: string;
  email: string;
  password: string;
  orgName: string;
  baseUrl: string;
  timezone: string;
  context: IRequestContext;
}
