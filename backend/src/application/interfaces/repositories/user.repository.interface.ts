import type { CreateInvitedDTO } from "../../dtos/user/request/user-request.dto.js";
import { User } from '../../../domain/entities/user.entity.js';

export interface IUserRepository {
    createSuperAdmin(user: User): Promise<"created" | "already_exists">;
    createInvited(input: CreateInvitedDTO): Promise<void>;
    countSuperAdmins(): Promise<number>;
}
