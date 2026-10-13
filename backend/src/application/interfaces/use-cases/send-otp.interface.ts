import type { SendOtpInput } from '../../types/use-case/auth.types.ts';

export interface ISendOtpUseCase {
  execute(input: SendOtpInput): Promise<void>;
}
