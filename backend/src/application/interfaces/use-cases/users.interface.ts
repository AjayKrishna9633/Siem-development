import type {
  IChangeUserRoleInput,
  IListUsersInput,
  ISetUserStatusInput,
} from '../../dtos/user/request/user-request.dto.ts';
import type { IManagedUser, IUserPage } from '../../types/use-case/user-mgmt.types.ts';

export interface IChangeUserRoleUseCase {
  execute(input: IChangeUserRoleInput): Promise<IManagedUser>;
}

export interface ISetUserStatusUseCase {
  execute(input: ISetUserStatusInput): Promise<IManagedUser>;
}

export interface IListUsersUseCase {
  execute(input: IListUsersInput): Promise<IUserPage>;
}
