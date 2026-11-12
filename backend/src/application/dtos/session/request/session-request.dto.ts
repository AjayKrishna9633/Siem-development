import type { IRequestContext } from '../../../interfaces/repositories/audit-log.repository.interface.ts';

export interface ILoginInput {
  email: string;
  password: string;
  context: IRequestContext;
}
