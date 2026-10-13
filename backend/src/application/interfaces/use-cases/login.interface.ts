import type { ILoginInput, ILoginResponse } from '../../types/use-case/auth.types.ts';

export interface ILoginUseCase {
  execute(input: ILoginInput): Promise<ILoginResponse>;
}
