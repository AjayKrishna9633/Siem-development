import { api } from './api.ts';
import type { IApiResponse, ILoginResponse } from '../types/auth.ts';

export interface ICompleteSetupData {
  token: string;
  adminName: string;
  email: string;
  password: string;
  orgName: string;
  baseUrl: string;
  timezone: string;
}

// First-run setup. Both calls answer 404 once setup has been completed.
export const setupService = {
  async verifyToken(token: string): Promise<void> {
    await api.post<IApiResponse<null>>('/setup/verify-token', { token });
  },

  // Creates the first admin and signs them in
  async complete(data: ICompleteSetupData): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/setup/complete', data);
    return res.data.data;
  },
};
