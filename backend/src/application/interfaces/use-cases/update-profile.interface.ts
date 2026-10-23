import type { IUpdateProfileDTO } from '../../dtos/user/request/user-request.dto.ts';
import type { IUserProfileResponse } from '../../types/use-case/auth.types.ts';

export interface IUpdateProfileUseCase {
  execute(input: IUpdateProfileDTO): Promise<IUserProfileResponse>;
}
