export interface IEmailMessage {
  to: string;
  subject: string;
  // Always sent, as the fallback for plain-text mail clients
  text: string;
  html?: string;
}

export interface IEmailDelivery {
  // False when email isn't configured or the mail server refused it. Callers that
  // hand out links then show the link to the admin instead — one code path either way.
  delivered: boolean;
}

export interface IEmailService {
  readonly isConfigured: boolean;
  // Never throws: a failure is logged and reported as { delivered: false }
  send(message: IEmailMessage): Promise<IEmailDelivery>;
}
