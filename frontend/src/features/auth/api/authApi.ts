import { api, INLINE_ERRORS } from '@/services/api.ts';
import type { IApiResponse, ICodeSent } from '@/types/auth.ts';
import type {
  ILoginResponse,
  IUser,
  IInvitePreview,
  IPasswordResetPreview,
} from '../types/auth.types.ts';

export const authService = {
  async login(email: string, password: string): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>(
      '/auth/login',
      { email, password },
      INLINE_ERRORS,
    );
    return res.data.data;
  },

  async getInvite(token: string): Promise<IInvitePreview> {
    const res = await api.get<IApiResponse<IInvitePreview>>('/auth/invite', {
      ...INLINE_ERRORS,
      params: { token },
    });
    return res.data.data;
  },

  async acceptInvite(data: {
    token: string;
    name: string;
    password: string;
  }): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>(
      '/auth/invite/accept',
      data,
      INLINE_ERRORS,
    );
    return res.data.data;
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/password-reset/request', { email }, INLINE_ERRORS);
  },

  async getPasswordReset(token: string): Promise<IPasswordResetPreview> {
    const res = await api.get<IApiResponse<IPasswordResetPreview>>('/auth/password-reset', {
      ...INLINE_ERRORS,
      params: { token },
    });
    return res.data.data;
  },

  async resetPassword(data: { token: string; password: string }): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/password-reset', data, INLINE_ERRORS);
  },

  async logout(): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/logout', null, INLINE_ERRORS);
  },

  async getMe(): Promise<IUser> {
    const res = await api.get<IApiResponse<IUser>>('/auth/me');
    return res.data.data;
  },

  async updateProfile(data: { username: string }): Promise<IUser> {
    const res = await api.put<IApiResponse<IUser>>('/auth/profile', data, INLINE_ERRORS);
    return res.data.data;
  },

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/password', data, INLINE_ERRORS);
    return res.data.data;
  },

  async requestEmailChange(data: {
    newEmail: string;
    currentPassword: string;
  }): Promise<ICodeSent> {
    const res = await api.post<IApiResponse<ICodeSent>>('/auth/email/code', data, INLINE_ERRORS);
    return res.data.data;
  },

  async changeEmail(code: string): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>(
      '/auth/email',
      { code },
      INLINE_ERRORS,
    );
    return res.data.data;
  },
};
