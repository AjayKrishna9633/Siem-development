import type {
  IPasswordResetPreview,
  IResetLinkDelivery,
} from '../../application/types/use-case/password-reset.types.ts';
import { iso } from './dates.ts';

export interface IPasswordResetPreviewDto {
  email: string;
  expiresAt: string;
}

export interface IResetLinkDeliveryDto {
  delivered: boolean;
  expiresAt: string;
  link?: string;
}

export const toPasswordResetPreviewDto = (
  preview: IPasswordResetPreview,
): IPasswordResetPreviewDto => ({
  email: preview.email,
  expiresAt: iso(preview.expiresAt),
});

export const toResetLinkDeliveryDto = (delivery: IResetLinkDelivery): IResetLinkDeliveryDto => ({
  delivered: delivery.delivered,
  expiresAt: iso(delivery.expiresAt),
  ...(delivery.link !== undefined && { link: delivery.link }),
});
