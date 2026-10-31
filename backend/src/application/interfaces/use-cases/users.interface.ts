import type {
  IAddUserInput,
  IAddUserResponse,
  IListUsersInput,
  IManagedUser,
} from '../../types/use-case/user-mgmt.types.ts';

export interface IAddUserUseCase {
  execute(input: IAddUserInput): Promise<IAddUserResponse>;
}

export interface IListUsersUseCase {
  execute(input: IListUsersInput): Promise<IManagedUser[]>;
}
