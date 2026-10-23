import { injectable, inject } from 'inversify';
import type { DataSource } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type { ICompanyRepository } from '../../../application/interfaces/repositories/company.repository.interface.ts';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import type { Company } from '../../../domain/entities/company.entity.ts';
import { BaseRepository } from './base.repository.ts';
import { CompanyModel } from '../models/company.model.ts';

@injectable()
export class TypeOrmCompanyRepository
  extends BaseRepository<Company, CompanyModel>
  implements ICompanyRepository
{
  constructor(
    @inject(TYPES.DataSource) db: DataSource,
    @inject(TYPES.CompanyMapper) mapper: IMapper<Company, CompanyModel>,
  ) {
    super(db, CompanyModel, mapper);
  }

  async findAll(): Promise<Company[]> {
    const models = await this.repository.find({ order: { createdAt: 'DESC' } });
    return models.map((model) => this.mapper.toDomain(model));
  }

  async findByName(name: string): Promise<Company | null> {
    const model = await this.repository
      .createQueryBuilder('company')
      .where('LOWER(company.name) = LOWER(:name)', { name: name.trim() })
      .getOne();
    return model ? this.mapper.toDomain(model) : null;
  }
}
