import { injectable, inject } from 'inversify';
import ObjectTypes from '../../../domain/constants/types.js';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import {User} from '../../../domain/entities/user.entity.js';
import { AppError } from "../../../domain/errors/AppError.js";
import { AppErrorCode } from "../../../domain/enums/AppErrorCode.js";
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.js';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { RegisterSuperAdminInput } from '../../types/use-case/admin.types.js';
import type { IRegisterSuperAdminUseCase } from '../../interfaces/use-cases/register-super-admin.interface.js';

@injectable()
export class RegisterSuperAdminUseCase implements IRegisterSuperAdminUseCase {
  constructor(
    @inject(ObjectTypes.UserRepository) private readonly users: IUserRepository,
    @inject(ObjectTypes.HashService) private readonly hasher: IHashService,
  ) {}


  async execute(input: RegisterSuperAdminInput): Promise<{ id: string; email: string }> {
    const adminCount = await this.users.countSuperAdmins();
    if (adminCount > 0) {
      throw new AppError(AppErrorCode.SETUP_ALREADY_DONE, ErrorMessage.SETUP_ALREADY_DONE);
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
      throw new AppError(AppErrorCode.SETUP_ALREADY_DONE, ErrorMessage.SETUP_ALREADY_DONE_RACE);
    }

    return { id: user.id, email: user.email };
  }
}