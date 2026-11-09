import type { ICodeSentResponse } from '../../../types/use-case/account.types.ts';

export interface ICodeSentDto {
  sentTo: string;
  expiresInMinutes: number;
}

export const toCodeSentDto = (sent: ICodeSentResponse): ICodeSentDto => ({
  sentTo: sent.sentTo,
  expiresInMinutes: sent.expiresInMinutes,
});
