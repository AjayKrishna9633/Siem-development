import { DataSource } from 'typeorm';
import { env } from '../../config/env.config.ts';
import { UserModel } from './models/user.model.ts';
import { CompanyModel } from './models/company.model.ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: env.NODE_ENV === 'development',
  logging: false, // <-- set this to false to hide query lines
  entities: [UserModel, CompanyModel],
});
