import type { IRequestContext } from '../repositories/audit-log.repository.interface.ts';

export interface ILogoutInput {
  refreshToken: string | null;
  context: IRequestContext;
}

export interface ILogoutUseCase {
  execute(input: ILogoutInput): Promise<void>;
}
