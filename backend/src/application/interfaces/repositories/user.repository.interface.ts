import type { IBaseRepository } from './base.repository.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  // Everyone in this install, newest first
  findAll(): Promise<User[]>;
  findByIds(ids: string[]): Promise<User[]>;
}
