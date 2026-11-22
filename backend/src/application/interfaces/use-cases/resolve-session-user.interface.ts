import type { ITokenPayload } from '../services/token.service.interface.ts';

export interface IResolveSessionUserInput {
  userId: string;
  tokenVersion: number;
}

export interface ISessionUser extends ITokenPayload {
  displayName: string;
}

export interface IResolveSessionUserUseCase {
  execute(input: IResolveSessionUserInput): Promise<ISessionUser>;
}
