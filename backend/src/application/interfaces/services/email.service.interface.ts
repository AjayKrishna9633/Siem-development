export interface IEmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailDelivery {
  delivered: boolean;
}

export interface IEmailService {
  readonly isConfigured: boolean;
  send(message: IEmailMessage): Promise<IEmailDelivery>;
}
