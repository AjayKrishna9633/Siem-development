import { api } from './api.ts';
import type { IApiResponse, ITeamMemberWithActivation, IUser } from '../types/auth.ts';
import type { IActivationGrant } from '../types/company.ts';
import { isUuid } from '../lib/validation.ts';

// A company admin's own people. The backend scopes every call to the admin's company.
export const teamService = {
  async list(): Promise<IUser[]> {
    const res = await api.get<IApiResponse<IUser[]>>('/team');
    return res.data.data;
  },

  async add(data: { email: string; username: string }): Promise<ITeamMemberWithActivation> {
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
