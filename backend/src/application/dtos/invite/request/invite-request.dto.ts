import type { IActor } from '../../../types/use-case/actor.types.ts';
import type { IRequestContext } from '../../../interfaces/repositories/audit-log.repository.interface.ts';
import type { UserRole } from '../../../../domain/enums/UserRole.ts';

export interface IInviteUserInput {
  actor: IActor;
  email: string;
  role: UserRole;
  context: IRequestContext;
}

export interface IManageInviteInput {
  actor: IActor;
  userId: string;
  context: IRequestContext;
}

export interface IAcceptInviteInput {
  token: string;
  name: string;
  password: string;
  context: IRequestContext;
}
