import { injectable, inject } from 'inversify';
import type { DataSource } from 'typeorm';
import TYPES from '../../../domain/constants/types.ts';
import type { IAgentRepository } from '../../../application/interfaces/repositories/agent.repository.interface.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import { AgentModel } from '../models/agent.model.ts';

const UPDATED_COLUMNS = [
  'name',
  'ip',
  'status',
  'os_name',
  'os_platform',
  'os_version',
  'version',
  'groups',
  'registered_at',
  'last_keepalive_at',
  'removed_at',
];

@injectable()
export class TypeOrmAgentRepository implements IAgentRepository {
  constructor(@inject(TYPES.DataSource) private readonly _db: DataSource) {}

  async upsert(agent: IAgent): Promise<void> {
    await this._db
      .createQueryBuilder()
      .insert()
      .into(AgentModel)
      .values({ ...agent, removedAt: null })
      .orUpdate([...UPDATED_COLUMNS, 'updated_at'], ['wazuh_id'])
      .updateEntity(false)
      .execute();
  }
}
