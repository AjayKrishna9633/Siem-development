import type { IVerifyOtpInput } from '../../types/use-case/auth.types.ts';

export interface IVerifyOtpUseCase {
  execute(input: IVerifyOtpInput): Promise<void>;
}
