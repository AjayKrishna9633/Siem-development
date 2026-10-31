import type {
  IChangeUserRoleInput,
  IListUsersInput,
  IManagedUser,
  ISetUserStatusInput,
} from '../../types/use-case/user-mgmt.types.ts';

export interface IChangeUserRoleUseCase {
  execute(input: IChangeUserRoleInput): Promise<IManagedUser>;
}

export interface ISetUserStatusUseCase {
  execute(input: ISetUserStatusInput): Promise<IManagedUser>;
}

export interface IListUsersUseCase {
  execute(input: IListUsersInput): Promise<IManagedUser[]>;
}
