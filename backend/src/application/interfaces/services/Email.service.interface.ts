export interface IEmailService {
  // `html` is optional; `text` is always sent as the fallback for plain-text mail clients
  sendEmail(to: string, subject: string, text: string, html?: string): Promise<void>;
}
