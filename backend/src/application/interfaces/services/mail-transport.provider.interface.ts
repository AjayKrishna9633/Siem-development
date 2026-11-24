export type MailSource = 'env' | 'database' | 'none';

export interface IOutgoingMail {
  from: string | { name: string; address: string };
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// The parts of an SMTP client the application uses; nodemailer stays in infrastructure.
export interface IMailSender {
  sendMail(mail: IOutgoingMail): Promise<unknown>;
  verify(): Promise<unknown>;
  close(): void;
}

export interface IMailTransport {
  source: Exclude<MailSource, 'none'>;
  sender: IMailSender;
  from: IOutgoingMail['from'];
}

// Resolves where mail settings come from (SMTP_HOST in .env, then the database, then none) and
// caches the built client until invalidate() is called, which saving the settings does.
export interface IMailTransportProvider {
  current(): Promise<IMailTransport | null>;
  source(): Promise<MailSource>;
  invalidate(): void;
}
