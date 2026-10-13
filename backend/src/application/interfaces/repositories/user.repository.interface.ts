import type { ICreateInvitedDTO } from '../../dtos/user/request/user-request.dto.ts';
import type { User } from '../../../domain/entities/user.entity.ts';

export interface IUserRepository {
  createSuperAdmin(user: User): Promise<'created' | 'already_exists'>;
  createInvited(input: ICreateInvitedDTO): Promise<void>;
  countSuperAdmins(): Promise<number>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
