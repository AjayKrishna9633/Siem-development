import { DataSource } from 'typeorm';
import { PendingAgentModel } from '../infrastructure/database/models/pending-agent.model.ts';
import { EnrollmentTokenModel } from '../infrastructure/database/models/enrollment-token.model.ts';

// Only the two tables siemple_enroll may read, and no migrations: the API's migrate step is the
// only thing that changes the schema.
export const createEnrollDataSource = (url: string): DataSource =>
  new DataSource({
    type: 'postgres',
    url,
    synchronize: false,
    migrationsRun: false,
    migrations: [],
    logging: false,
    entities: [PendingAgentModel, EnrollmentTokenModel],
    applicationName: 'siemple-enroll',
    extra: { max: 10 },
  });
