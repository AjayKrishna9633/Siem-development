import type { CreateInvitedDTO } from "../../dtos/user.dto.js";
import { User } from "../../../domain/enitities/User.js";

export interface IUserRepository {
    createSuperAdmin(user: User): Promise<"created" | "already_exists">;
    createInvited(input: CreateInvitedDTO): Promise<void>;
    countSuperAdmins(): Promise<number>;
}
