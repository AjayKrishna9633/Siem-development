import type { UserStatus } from './auth.ts';

export type CompanyStatus = 'active' | 'deactivated';

export interface ICompanyAdmin {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
}

// What the super admin sees: the company and its admin, never the employee list
export interface ICompany {
  id: string;
  name: string;
  status: CompanyStatus;
  admin: ICompanyAdmin | null;
  userCount: number;
  createdAt: string;
  deactivatedAt: string | null;
}

// One-time credentials the new admin uses on the activation page
export interface IActivationGrant {
  activationId: string;
  activationLink: string;
  temporaryPassword: string;
  expiresAt: string;
  // False when the activation email couldn't be delivered; share the details by hand
  emailSent: boolean;
}

export interface ICompanyWithActivation {
  company: ICompany;
  activation: IActivationGrant;
}
