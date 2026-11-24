import { api, INLINE_ERRORS } from '@/services/api.ts';
import type { IApiResponse } from '@/types/auth.ts';
import type {
  IEmailSettings,
  IEmailSettingsInput,
  IEmailTestResult,
} from '../types/emailSettings.types.ts';

export const emailSettingsService = {
  async get(): Promise<IEmailSettings> {
    const res = await api.get<IApiResponse<IEmailSettings>>('/settings/email', INLINE_ERRORS);
    return res.data.data;
  },

  async save(input: IEmailSettingsInput): Promise<IEmailSettings> {
    const res = await api.put<IApiResponse<IEmailSettings>>(
      '/settings/email',
      input,
      INLINE_ERRORS,
    );
    return res.data.data;
  },

  async test(to?: string): Promise<IEmailTestResult> {
    const res = await api.post<IApiResponse<IEmailTestResult>>(
      '/settings/email/test',
      to ? { to } : {},
      INLINE_ERRORS,
    );
    return res.data.data;
  },

  async disable(): Promise<IEmailSettings> {
    const res = await api.delete<IApiResponse<IEmailSettings>>('/settings/email', INLINE_ERRORS);
    return res.data.data;
  },
};
