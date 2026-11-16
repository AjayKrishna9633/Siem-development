import type { IRequestContext } from '../../../interfaces/services/request-context.provider.interface.ts';

export interface ILoginInput {
  email: string;
  password: string;
  // Only for the sign-in IP remembered on the user.
  context: IRequestContext;
}
