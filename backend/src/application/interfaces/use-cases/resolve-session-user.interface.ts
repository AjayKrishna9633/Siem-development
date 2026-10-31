import type { ITokenPayload } from '../services/token.service.interface.ts';

export interface IResolveSessionUserInput {
  userId: string;
  tokenVersion: number;
}

// Turns a verified access token into the user as they are right now
export interface IResolveSessionUserUseCase {
  execute(input: IResolveSessionUserInput): Promise<ITokenPayload>;
}
