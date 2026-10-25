import type { UserRole } from '../../../domain/enums/UserRole.ts';
import type { UserStatus } from '../../../domain/enums/UserStatus.ts';
import type { CompanyStatus } from '../../../domain/enums/CompanyStatus.ts';
import type { IActivationGrant } from '../../interfaces/services/activation.service.interface.ts';

// The signed-in user performing an action, taken from the access token
export interface IActor {
  userId: string;
  role: UserRole;
  organizationId: string | null;
}

export interface ICompanyAdminSummary {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
}

// What the super admin sees: the company and its admin, never the employee list
export interface ICompanySummary {
  id: string;
  name: string;
  status: CompanyStatus;
  admin: ICompanyAdminSummary | null;
  userCount: number;
  createdAt: Date;
  deactivatedAt: Date | null;
}

export interface ICreateCompanyInput {
  actor: IActor;
  name: string;
  adminName: string;
  adminEmail: string;
}

export interface ICompanyWithActivation {
  company: ICompanySummary;
  activation: IActivationGrant;
}

export interface IUpdateCompanyInput {
  actor: IActor;
  companyId: string;
  name: string;
}

export interface IResendAdminActivationInput {
  actor: IActor;
  companyId: string;
}

export interface ISetCompanyStatusInput {
  actor: IActor;
  companyId: string;
  active: boolean;
}

export interface IReplaceCompanyAdminInput {
  actor: IActor;
  companyId: string;
  adminName: string;
  adminEmail: string;
}
