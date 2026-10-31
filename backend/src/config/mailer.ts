import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env.config.ts';

export interface IMailTransport {
  transporter: Transporter;
  from: string;
}

// Null when this install has no email set up; callers then hand links over by hand
export const createMailTransport = (): IMailTransport | null => {
  if (env.SMTP_HOST) {
    const sender = env.SMTP_FROM ?? env.SMTP_USER ?? 'siemple@localhost';
    return {
      transporter: nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
        ...(env.SMTP_USER && { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }),
      }),
      from: sender.includes('<') ? sender : `SIEMple <${sender}>`,
    };
  }

  if (env.OTP_EMAIL && env.OTP_PASSWORD) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user: env.OTP_EMAIL, pass: env.OTP_PASSWORD },
      }),
      from: `SIEMple <${env.OTP_EMAIL}>`,
    };
  }

  return null;
};
