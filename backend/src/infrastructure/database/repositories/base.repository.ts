import { injectable, unmanaged } from 'inversify';
import type {
  DataSource,
  Repository,
  EntityTarget,
  ObjectLiteral,
  FindOptionsWhere,
} from 'typeorm';
import type { IBaseRepository } from '../../../application/interfaces/repositories/base.repository.interface.ts';
import type { IMapper } from '../../../application/interfaces/IMapper.ts';

@injectable()
export abstract class BaseRepository<
  TDomain,
  TModel extends ObjectLiteral,
> implements IBaseRepository<TDomain> {
  protected readonly repository: Repository<TModel>;

  constructor(
    @unmanaged() protected readonly db: DataSource,
    @unmanaged() protected readonly entityTarget: EntityTarget<TModel>,
    @unmanaged() protected readonly mapper: IMapper<TDomain, TModel>,
  ) {
    this.repository = db.getRepository(entityTarget);
  }

  async findById(id: string): Promise<TDomain | null> {
    const model = await this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<TModel>,
    });
    if (!model) return null;

    return this.mapper.toDomain(model);
  }

  async save(entity: TDomain): Promise<void> {
    const persistenceModel = this.mapper.toPersistence(entity);
    await this.repository.save(persistenceModel);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
