import type { ITokenPayload } from '../services/token.service.interface.ts';

export interface IResolveSessionUserInput {
  userId: string;
  tokenVersion: number;
}

// The token payload plus what only the database knows now. displayName stays out of the payload
// itself so it never ends up inside a signed token.
export interface ISessionUser extends ITokenPayload {
  displayName: string;
}

export interface IResolveSessionUserUseCase {
  execute(input: IResolveSessionUserInput): Promise<ISessionUser>;
}
