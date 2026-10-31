import { api } from './api.ts';
import type {
  IApiResponse,
  ILoginResponse,
  IUser,
  ICodeSent,
  IInvitePreview,
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

  async sendOtp(email: string, type: 'reset'): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/send-otp', { email, type });
  },

  async verifyOtp(
    email: string,
    otp: string,
    type: 'reset',
  ): Promise<{ verified: boolean; resetToken?: string }> {
    const res = await api.post<IApiResponse<{ verified: boolean; resetToken?: string }>>(
      '/auth/verify-otp',
      { email, otp, type },
    );
    return res.data.data;
  },

  async resetPassword(data: {
    email: string;
    resetToken: string;
    newPassword: string;
  }): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/reset-password', data);
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

  // Password change, step 1: a code goes to the account's email
  async requestPasswordChange(): Promise<ICodeSent> {
    const res = await api.post<IApiResponse<ICodeSent>>('/auth/password/code');
    return res.data.data;
  },

  // Step 2: other devices are signed out; the returned session keeps this one signed in
  async changePassword(data: {
    code: string;
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
