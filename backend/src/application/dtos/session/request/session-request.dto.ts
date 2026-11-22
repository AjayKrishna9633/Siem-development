import type { IRequestContext } from '../../../interfaces/services/request-context.provider.interface.ts';

export interface ILoginInput {
  email: string;
  password: string;
  context: IRequestContext;
}
