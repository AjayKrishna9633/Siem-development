import type { ILoginResponse } from '../../types/use-case/auth.types.ts';

export interface IRefreshSessionInput {
  refreshToken: string;
}

export interface IRefreshSessionUseCase {
  execute(input: IRefreshSessionInput): Promise<ILoginResponse>;
}
