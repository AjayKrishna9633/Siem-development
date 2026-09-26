import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import type { IHashService } from '../../interface/service/hash.service.interface.ts';
import {User} from "../../../domain/enitities/User.js";
import { ApplicationError } from "../../../domain/errors/ApplicationError.js";
import type { IUserRepository } from '../../interface/repositories/user.repository.interface.ts';
export interface BootstrapSuperAdminInput {
  setupToken: string;
  email: string;
  username: string;
  password: string;
}

export interface RegisterSuperAdminInput {
  email: string;
  username: string;
  password: string;
}

export class RegisterSuperAdminUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IHashService,
  ) {}

  async execute(input: RegisterSuperAdminInput): Promise<{ id: string; email: string }> {
    const adminCount = await this.users.countSuperAdmins();
    if (adminCount > 0) {
      throw new ApplicationError('SETUP_ALREADY_DONE', 'A Super Admin is already registered. Registration route locked.');
    }

    const now = new Date();
    
    const user = User.createSuperAdmin({
      id: randomUUID(),
      email: input.email,
      username: input.username,
      passwordHash: await this.hasher.hash(input.password),
      now,
    });

    const result = await this.users.createSuperAdmin(user);
    
    if (result === 'already_exists') {
      throw new ApplicationError('SETUP_ALREADY_DONE', 'Setup already completed due to race condition.');
    }

    return { id: user.id, email: user.email };
  }
}