import type { User } from '../../../domain/entities/user.entity.ts';
import type { ITeamMember } from '../../types/use-case/user-mgmt.types.ts';

export const toTeamMember = (user: User): ITeamMember => {
  const snap = user.toSnapshot();
  return {
    id: snap.id,
    email: snap.email,
    username: snap.username,
    role: snap.role,
    status: snap.status,
    createdAt: snap.createdAt,
    lastLoginAt: snap.lastLoginAt,
  };
};
