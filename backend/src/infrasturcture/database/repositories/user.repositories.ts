import type { DataSource } from 'typeorm';
import type { IUserRepository } from '../../../application/interface/repositories/user.repository.interface.ts';
import { UserModel } from '../models/user.model.js';               
import type { User } from '../../../domain/enitities/User.js';
import type { CreateInvitedDTO } from '../../../application/dtos/user.dto.js';

export class TypeOrmuUserRepository implements IUserRepository{
    constructor(
        private db:DataSource
    ){}

    countSuperAdmins(): Promise<number>{
        return this.db.getRepository(UserModel).count({where:{role:'super_admin'}});
    }
    createSuperAdmin(user: User): Promise<'created' | 'already_exists'> {
    return this.db.transaction<'created' | 'already_exists'>(async (manager) => {
      
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('bootstrap_super_admin'))`);
      
      const existing = await manager.countBy(UserModel, { role: 'super_admin' });
      if (existing > 0) return 'already_exists';
      
      await manager.insert(UserModel, user.toSnapshot());
      
      return 'created';
    });
    }

    async createInvited(input: CreateInvitedDTO): Promise<void> {
        await this.db.getRepository(UserModel).insert(input as any);
    }
}