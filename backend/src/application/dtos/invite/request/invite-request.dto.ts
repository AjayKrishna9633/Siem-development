import type { IActor } from '../../../types/use-case/actor.types.ts';
import type { IRequestContext } from '../../../interfaces/services/request-context.provider.interface.ts';
import type { UserRole } from '../../../../domain/enums/UserRole.ts';

export interface IInviteUserInput {
  actor: IActor;
  email: string;
  role: UserRole;
}

export interface IManageInviteInput {
  actor: IActor;
  userId: string;
}

export interface IAcceptInviteInput {
  token: string;
  name: string;
  password: string;
  context: IRequestContext;
}
