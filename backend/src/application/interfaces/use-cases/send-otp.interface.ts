import type { SendOtpInput } from '../../types/use-case/auth.types.js';

export interface ISendOtpUseCase {
  execute(input: SendOtpInput): Promise<void>;
}
