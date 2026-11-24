import type { IActor } from '../../../types/use-case/actor.types.ts';
import type { SmtpSecurity } from '../../../../domain/enums/SmtpSecurity.ts';

export interface IEmailSettingsActorInput {
  actor: IActor;
}

export interface IUpdateEmailSettingsInput {
  actor: IActor;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string | null;
  // undefined keeps the stored password; it is never echoed back.
  password: string | undefined;
  fromAddress: string;
  fromName: string | null;
}

export interface ITestEmailSettingsInput {
  actor: IActor;
  to: string | undefined;
}
