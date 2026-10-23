import type { CompanyStatus } from '../enums/CompanyStatus.ts';

export interface ICompanyProps {
  id: string;
  name: string;
  status: CompanyStatus;
  adminUserId: string | null;
  createdById: string | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export type CompanyProps = ICompanyProps;
