import { api } from './api.ts';
import type {
  IApiResponse,
  ILinkDelivery,
  IInviteResult,
  IManagedUser,
  IPendingInvite,
  IUserListParams,
  IUserPage,
  UserRole,
} from '../types/auth.ts';
import { isUuid } from '../lib/schemas.ts';

export const usersService = {
  async list(params: IUserListParams): Promise<IUserPage> {
    const [users, invites] = await Promise.all([
      api.get<IApiResponse<IUserPage>>('/users', { params }),
      api.get<IApiResponse<IPendingInvite[]>>('/users/invites'),
    ]);
    const expired = new Map(invites.data.data.map((i) => [i.userId, i.expired]));
    const page = users.data.data;
    return {
      ...page,
      items: page.items.map((u) =>
        u.status === 'invited' ? { ...u, inviteExpired: expired.get(u.id) ?? true } : u,
      ),
    };
  },

  async invite(data: { email: string; role: UserRole }): Promise<IInviteResult> {
    const res = await api.post<IApiResponse<IInviteResult>>('/users/invites', data);
    return res.data.data;
  },

  async changeRole(userId: string, role: UserRole): Promise<IManagedUser> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const res = await api.patch<IApiResponse<IManagedUser>>(`/users/${userId}/role`, { role });
    return res.data.data;
  },

  async setEnabled(userId: string, enabled: boolean): Promise<IManagedUser> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const action = enabled ? 'enable' : 'disable';
    const res = await api.post<IApiResponse<IManagedUser>>(`/users/${userId}/${action}`);
    return res.data.data;
  },

  async resendInvite(userId: string): Promise<ILinkDelivery> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const res = await api.post<IApiResponse<ILinkDelivery>>(`/users/${userId}/invite/resend`);
    return res.data.data;
  },

  async issueResetLink(userId: string): Promise<ILinkDelivery> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    const res = await api.post<IApiResponse<ILinkDelivery>>(`/users/${userId}/password-reset`);
    return res.data.data;
  },

  async revokeInvite(userId: string): Promise<void> {
    if (!isUuid(userId)) throw new Error('Invalid user ID.');
    await api.delete<IApiResponse<null>>(`/users/${userId}/invite`);
  },
};
