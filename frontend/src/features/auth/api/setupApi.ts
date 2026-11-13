import { api, INLINE_ERRORS } from '@/services/api.ts';
import type { IApiResponse } from '@/types/auth.ts';
import type { ILoginResponse } from '../types/auth.types.ts';

export interface ICompleteSetupData {
  token: string;
  adminName: string;
  email: string;
  password: string;
  orgName: string;
  baseUrl: string;
}

export const setupService = {
  async verifyToken(token: string): Promise<void> {
    await api.post<IApiResponse<null>>('/setup/verify-token', { token }, INLINE_ERRORS);
  },

  async complete(data: ICompleteSetupData): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>(
      '/setup/complete',
      data,
      INLINE_ERRORS,
    );
    return res.data.data;
  },
};
