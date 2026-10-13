import { DataSource } from 'typeorm';
import { env } from '../../config/env.config.ts';
import { UserModel } from './models/user.model.ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: env.NODE_ENV === 'development',
  logging: env.NODE_ENV === 'development',
  entities: [UserModel],
  migrations: [],
  subscribers: [],
});
