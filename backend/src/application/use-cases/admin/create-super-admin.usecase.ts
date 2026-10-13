import { injectable, inject } from 'inversify';
import ObjectTypes from '../../../domain/constants/types.ts';
import { randomUUID } from 'node:crypto';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import { User } from '../../../domain/entities/user.entity.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { RegisterSuperAdminInput } from '../../types/use-case/admin.types.ts';
import type { IRegisterSuperAdminUseCase } from '../../interfaces/use-cases/register-super-admin.interface.ts';

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
