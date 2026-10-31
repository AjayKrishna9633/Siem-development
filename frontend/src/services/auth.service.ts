import { api } from './api.ts';
import type {
  IApiResponse,
  ILoginResponse,
  IUser,
  ICodeSent,
  IInvitePreview,
  IPasswordResetPreview,
} from '../types/auth.ts';

export const authService = {
  async login(email: string, password: string): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/login', {
      email,
      password,
    });
    return res.data.data;
  },

  // The accept page opens with this; any problem with the link is one generic error
  async getInvite(token: string): Promise<IInvitePreview> {
    const res = await api.get<IApiResponse<IInvitePreview>>('/auth/invite', {
      params: { token },
    });
    return res.data.data;
  },

  // Spends the link, activates the account and signs the person in
  async acceptInvite(data: {
    token: string;
    name: string;
    password: string;
  }): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/invite/accept', data);
    return res.data.data;
  },

  // Always answers the same, whether or not the account exists
  async requestPasswordReset(email: string): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/password-reset/request', { email });
  },

  async getPasswordReset(token: string): Promise<IPasswordResetPreview> {
    const res = await api.get<IApiResponse<IPasswordResetPreview>>('/auth/password-reset', {
      params: { token },
    });
    return res.data.data;
  },

  // Signs the account out everywhere; the person then signs in with the new password
  async resetPassword(data: { token: string; password: string }): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/password-reset', data);
  },

  async logout(): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/logout');
  },

  async getMe(): Promise<IUser> {
    const res = await api.get<IApiResponse<IUser>>('/auth/me');
    return res.data.data;
  },

  async updateProfile(data: { username: string }): Promise<IUser> {
    const res = await api.put<IApiResponse<IUser>>('/auth/profile', data);
    return res.data.data;
  },

  // Other devices are signed out; the returned session keeps this one signed in
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/password', data);
    return res.data.data;
  },

  // Admin only. Step 1: the code goes to the NEW address
  async requestEmailChange(data: {
    newEmail: string;
    currentPassword: string;
  }): Promise<ICodeSent> {
    const res = await api.post<IApiResponse<ICodeSent>>('/auth/email/code', data);
    return res.data.data;
  },

  async changeEmail(code: string): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/email', { code });
    return res.data.data;
  },
};
