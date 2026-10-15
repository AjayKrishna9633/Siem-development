import type { IResetPasswordInput } from '../../types/use-case/auth.types.ts';

export interface IResetPasswordUseCase {
  execute(input: IResetPasswordInput): Promise<void>;
}
