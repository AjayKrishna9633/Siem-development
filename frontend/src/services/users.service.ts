import { api } from './api.ts';
import type {
  IApiResponse,
  IInviteDelivery,
  IInviteResult,
  IManagedUser,
  IPendingInvite,
  UserRole,
} from '../types/auth.ts';
import { isUuid } from '../lib/validation.ts';

// Everyone in the install. Admins only; the backend enforces it.
export const usersService = {
  // Everyone, with whether each invited person's link has expired merged in
  async list(): Promise<IManagedUser[]> {
    const [users, invites] = await Promise.all([
      api.get<IApiResponse<IManagedUser[]>>('/users'),
      api.get<IApiResponse<IPendingInvite[]>>('/users/invites'),
    ]);
    const expired = new Map(invites.data.data.map((i) => [i.userId, i.expired]));
    return users.data.data.map((u) =>
      u.status === 'invited' ? { ...u, inviteExpired: expired.get(u.id) ?? true } : u,
    );
  },

  async invite(data: { email: string; role: UserRole }): Promise<IInviteResult> {
    const res = await api.post<IApiResponse<IInviteResult>>('/users/invites', data);
    return res.data.data;
  },

  // Applies to the user's next request; they stay signed in
  async changeRole(userId: string, role: UserRole): Promise<IManagedUser> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const res = await api.patch<IApiResponse<IManagedUser>>(`/users/${userId}/role`, { role });
    return res.data.data;
  },

  // Disabling signs the user out everywhere at once
  async setEnabled(userId: string, enabled: boolean): Promise<IManagedUser> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const action = enabled ? 'enable' : 'disable';
    const res = await api.post<IApiResponse<IManagedUser>>(`/users/${userId}/${action}`);
    return res.data.data;
  },

  // A new link valid for 48 hours; the previous one stops working
  async resendInvite(userId: string): Promise<IInviteDelivery> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const res = await api.post<IApiResponse<IInviteDelivery>>(`/users/${userId}/invite/resend`);
    return res.data.data;
  },

  // The invited person is removed; the same email can be invited again
  async revokeInvite(userId: string): Promise<void> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    await api.delete<IApiResponse<null>>(`/users/${userId}/invite`);
  },
};
