import type { IBaseRepository } from './base.repository.interface.ts';
import type { Company } from '../../../domain/entities/company.entity.ts';

export interface ICompanyRepository extends IBaseRepository<Company> {
  findAll(): Promise<Company[]>;
  // Case-insensitive, so "Acme" and "acme" count as the same company
  findByName(name: string): Promise<Company | null>;
}
