import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import type { IActor } from '../../types/use-case/company.types.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import type { Company } from '../../../domain/entities/company.entity.ts';
import type { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// Routes already guard roles; use cases re-check so they are safe to call from anywhere
export const assertRole = (actor: IActor, ...roles: UserRole[]): void => {
  if (!roles.includes(actor.role)) {
    throw new AppError(AppErrorCode.FORBIDDEN, ErrorMessage.FORBIDDEN);
  }
};

export const loadCompany = async (companies: ICompanyRepository, id: string): Promise<Company> => {
  const company = await companies.findById(id);
  if (!company) {
    throw new AppError(AppErrorCode.COMPANY_NOT_FOUND, ErrorMessage.COMPANY_NOT_FOUND);
  }
  return company;
};

// Members of a deactivated company cannot sign in, refresh or activate.
// The platform super admin has no company and is never blocked here.
export const assertCompanyActive = async (
  companies: ICompanyRepository,
  user: User,
): Promise<void> => {
  if (!user.organizationId) return;
  const company = await companies.findById(user.organizationId);
  if (!company || !company.isActive) {
    throw new AppError(AppErrorCode.COMPANY_DEACTIVATED, ErrorMessage.COMPANY_DEACTIVATED);
  }
};
