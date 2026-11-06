import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';

export interface IIssueSetupTokenInput {
  replaceExisting: boolean;
}

export type IssueSetupTokenResult =
  | { status: 'completed' }
  | { status: 'existing'; expiresAt: Date }
  | { status: 'issued'; token: string; expiresAt: Date };

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
