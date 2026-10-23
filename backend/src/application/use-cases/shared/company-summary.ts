import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ICompanySummary } from '../../types/use-case/company.types.ts';
import type { Company } from '../../../domain/entities/company.entity.ts';
import type { User } from '../../../domain/entities/user.entity.ts';

export const toCompanySummary = (
  company: Company,
  admin: User | null,
  userCount: number,
): ICompanySummary => {
  const snap = company.toSnapshot();
  return {
    id: snap.id,
    name: snap.name,
    status: snap.status,
    admin: admin
      ? { id: admin.id, username: admin.username, email: admin.email, status: admin.status }
      : null,
    userCount,
    createdAt: snap.createdAt,
    deactivatedAt: snap.deactivatedAt,
  };
};

export const summarizeCompany = async (
  users: IUserRepository,
  company: Company,
): Promise<ICompanySummary> => {
  const admin = company.adminUserId ? await users.findById(company.adminUserId) : null;
  const counts = await users.countByOrganization();
  return toCompanySummary(company, admin, counts.get(company.id) ?? 0);
};
