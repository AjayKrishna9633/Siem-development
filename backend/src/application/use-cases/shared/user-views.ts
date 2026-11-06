import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ILoginResponse, IUserProfileResponse } from '../../types/use-case/auth.types.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { permissionsFor } from '../../../domain/policies/permissions.policy.ts';

export const startSession = async (
  sessions: ISessionService,
  user: User,
  familyId?: string,
): Promise<ILoginResponse> => {
  const { accessToken, refreshToken } = await sessions.issue(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    familyId,
  );
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.displayName,
      role: user.role,
      permissions: permissionsFor(user.role),
    },
  };
};

export const toUserProfile = (user: User): IUserProfileResponse => {
  const snapshot = user.toSnapshot();
  return {
    id: user.id,
    email: user.email,
    username: user.displayName,
    role: user.role,
    permissions: permissionsFor(user.role),
    status: user.status,
    isEmailVerified: snapshot.isEmailVerified,
    lastLoginAt: snapshot.lastLoginAt,
    createdAt: snapshot.createdAt,
  };
};
