import { api } from './api.ts';
import type {
  IApiResponse,
  ILoginResponse,
  IUser,
  ICodeSent,
  IActivationPreview,
  IVerifiedActivation,
} from '../types/auth.ts';

export const authService = {
  async login(email: string, password: string): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/login', {
      email,
      password,
    });
    return res.data.data;
  },

  async registerSuperAdmin(data: {
    email: string;
    username: string;
    password: string;
  }): Promise<{ id: string; email: string }> {
    const res = await api.post<IApiResponse<{ id: string; email: string }>>(
      '/admin/register-super-admin',
      data,
    );
    return res.data.data;
  },

  // Activation link route: the ID in the link is enough to open the set-password step
  async getActivation(activationId: string): Promise<IActivationPreview> {
    const res = await api.get<IApiResponse<IActivationPreview>>('/auth/activation', {
      params: { id: activationId },
    });
    return res.data.data;
  },

  // Temporary-password route: email + temporary password stand in for the link
  async verifyActivation(email: string, temporaryPassword: string): Promise<IVerifiedActivation> {
    const res = await api.post<IApiResponse<IVerifiedActivation>>('/auth/activation/verify', {
      email,
      temporaryPassword,
    });
    return res.data.data;
  },

  async activate(activationId: string, newPassword: string): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/activate', {
      activationId,
      newPassword,
    });
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

  // Super admin only. Step 1: the code goes to the NEW address
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
