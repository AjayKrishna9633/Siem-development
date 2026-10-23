import { api } from './api.ts';
import type {
  IApiResponse,
  ILoginResponse,
  IUser,
  IDemoAccount,
  IInviteResponse,
  IVerifyInviteResponse,
  UserRole,
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

  async seedDemo(): Promise<{ message: string; accounts: IDemoAccount[] }> {
    const res =
      await api.post<IApiResponse<{ message: string; accounts: IDemoAccount[] }>>(
        '/auth/seed-demo',
      );
    return res.data.data;
  },

  async inviteUser(data: {
    email: string;
    username: string;
    role: UserRole;
    organizationId?: string | null;
  }): Promise<IInviteResponse> {
    const res = await api.post<IApiResponse<IInviteResponse>>('/auth/invite', data);
    return res.data.data;
  },

  async verifyInvite(token: string): Promise<IVerifyInviteResponse> {
    const res = await api.get<IApiResponse<IVerifyInviteResponse>>(
      `/auth/verify-invite?token=${encodeURIComponent(token)}`,
    );
    return res.data.data;
  },

  async acceptInvite(data: {
    token: string;
    password: string;
    username?: string;
  }): Promise<ILoginResponse> {
    const res = await api.post<IApiResponse<ILoginResponse>>('/auth/accept-invite', data);
    return res.data.data;
  },

  async sendOtp(email: string, type: 'signup' | 'reset'): Promise<void> {
    await api.post<IApiResponse<null>>('/auth/send-otp', { email, type });
  },

  async verifyOtp(
    email: string,
    otp: string,
    type: 'signup' | 'reset',
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

  async listUsers(): Promise<IUser[]> {
    const res = await api.get<IApiResponse<IUser[]>>('/auth/users');
    return res.data.data;
  },
};
