import type {
  IInviteDelivery,
  IInvitePreview,
  IInviteResult,
  IPendingInvite,
} from '../../../types/use-case/invite.types.ts';
import { iso, isoOrNull } from '../../dates.ts';
import { toManagedUserDto, type IManagedUserDto } from '../../user/response/user-response.dto.ts';

export interface IInviteDeliveryDto {
  delivered: boolean;
  expiresAt: string;
  link?: string;
}

export interface IInviteResultDto {
  user: IManagedUserDto;
  invite: IInviteDeliveryDto;
}

export interface IPendingInviteDto {
  userId: string;
  email: string;
  role: string;
  invitedAt: string;
  expiresAt: string | null;
  expired: boolean;
}

export interface IInvitePreviewDto {
  email: string;
  role: string;
  orgName: string | null;
  expiresAt: string;
}

export const toInviteDeliveryDto = (delivery: IInviteDelivery): IInviteDeliveryDto => ({
  delivered: delivery.delivered,
  expiresAt: iso(delivery.expiresAt),
  ...(delivery.link !== undefined && { link: delivery.link }),
});

export const toInviteResultDto = (result: IInviteResult): IInviteResultDto => ({
  user: toManagedUserDto(result.user),
  invite: toInviteDeliveryDto(result.invite),
});

export const toPendingInviteDto = (invite: IPendingInvite): IPendingInviteDto => ({
  userId: invite.userId,
  email: invite.email,
  role: invite.role,
  invitedAt: iso(invite.invitedAt),
  expiresAt: isoOrNull(invite.expiresAt),
  expired: invite.expired,
});

export const toInvitePreviewDto = (preview: IInvitePreview): IInvitePreviewDto => ({
  email: preview.email,
  role: preview.role,
  orgName: preview.orgName,
  expiresAt: iso(preview.expiresAt),
});
