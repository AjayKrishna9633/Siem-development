import type {
  IAcceptInviteInput,
  IInviteUserInput,
  IManageInviteInput,
} from '../../dtos/invite/request/invite-request.dto.ts';
import type {
  IInviteDelivery,
  IInvitePreview,
  IInviteResult,
  IPendingInvite,
} from '../../types/use-case/invite.types.ts';
import type { IActor } from '../../types/use-case/actor.types.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';

export interface IInviteUserUseCase {
  execute(input: IInviteUserInput): Promise<IInviteResult>;
}

export interface IResendInviteUseCase {
  execute(input: IManageInviteInput): Promise<IInviteDelivery>;
}

export interface IRevokeInviteUseCase {
  execute(input: IManageInviteInput): Promise<void>;
}

export interface IListPendingInvitesUseCase {
  execute(input: { actor: IActor }): Promise<IPendingInvite[]>;
}

export interface IGetInviteUseCase {
  execute(input: { token: string }): Promise<IInvitePreview>;
}

export interface IAcceptInviteUseCase {
  execute(input: IAcceptInviteInput): Promise<ILoginResponse>;
}
