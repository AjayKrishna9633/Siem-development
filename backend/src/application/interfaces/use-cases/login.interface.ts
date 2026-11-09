import type { ILoginInput } from '../../dtos/session/request/session-request.dto.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';

export interface ILoginUseCase {
  execute(input: ILoginInput): Promise<ILoginResponse>;
}
