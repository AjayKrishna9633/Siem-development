import { api } from './api.ts';
import type {
  IActivationGrant,
  IApiResponse,
  ITeamMemberWithActivation,
  IUser,
  UserRole,
} from '../types/auth.ts';
import { isUuid } from '../lib/validation.ts';

// Everyone in the install. Admins only; the backend enforces it.
export const teamService = {
  async list(): Promise<IUser[]> {
    const res = await api.get<IApiResponse<IUser[]>>('/team');
    return res.data.data;
  },

  async add(data: {
    email: string;
    username: string;
    role: UserRole;
  }): Promise<ITeamMemberWithActivation> {
    const res = await api.post<IApiResponse<ITeamMemberWithActivation>>('/team', data);
    return res.data.data;
  },

  // Issues a new link + temporary password; the previous ones stop working
  async resendActivation(userId: string): Promise<IActivationGrant> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const res = await api.post<IApiResponse<IActivationGrant>>(`/team/${userId}/activation`);
    return res.data.data;
  },
};
