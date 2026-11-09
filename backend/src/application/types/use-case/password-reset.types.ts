export interface IPasswordResetPreview {
  email: string;
  expiresAt: Date;
}

export interface IResetLinkDelivery {
  delivered: boolean;
  expiresAt: Date;
  link?: string;
}

export interface IRecoveryLink {
  link: string;
  expiresAt: Date;
}
