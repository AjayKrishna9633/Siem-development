import { api } from './api.ts';
import type {
  IActivationGrant,
  IApiResponse,
  IUserWithActivation,
  IUser,
  UserRole,
} from '../types/auth.ts';
import { isUuid } from '../lib/validation.ts';

// Everyone in the install. Admins only; the backend enforces it.
export const usersService = {
  async list(): Promise<IUser[]> {
    const res = await api.get<IApiResponse<IUser[]>>('/users');
    return res.data.data;
  },

  async add(data: {
    email: string;
    username: string;
    role: UserRole;
  }): Promise<IUserWithActivation> {
    const res = await api.post<IApiResponse<IUserWithActivation>>('/users', data);
    return res.data.data;
  },

  // Issues a new link + temporary password; the previous ones stop working
  async resendActivation(userId: string): Promise<IActivationGrant> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const res = await api.post<IApiResponse<IActivationGrant>>(`/users/${userId}/activation`);
    return res.data.data;
  },
};
