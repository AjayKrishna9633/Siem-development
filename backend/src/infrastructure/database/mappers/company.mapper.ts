import { injectable } from 'inversify';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';
import { Company } from '../../../domain/entities/company.entity.ts';
import { CompanyModel } from '../models/company.model.ts';

@injectable()
export class CompanyMapper implements IMapper<Company, CompanyModel> {
  toDomain(model: CompanyModel): Company {
    return Company.reconstitute({
      id: model.id,
      name: model.name,
      status: model.status,
      adminUserId: model.adminUserId,
      createdById: model.createdById,
      deactivatedAt: model.deactivatedAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  toPersistence(entity: Company): CompanyModel {
    const model = new CompanyModel();
    Object.assign(model, entity.toSnapshot());
    return model;
  }
}
