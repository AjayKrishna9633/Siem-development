import type { IUserProfileResponse } from '../../types/use-case/auth.types.ts';

export interface IGetCurrentUserInput {
  userId: string;
  tokenVersion: number;
}

export interface IGetCurrentUserUseCase {
  execute(input: IGetCurrentUserInput): Promise<IUserProfileResponse>;
}
