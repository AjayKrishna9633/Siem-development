import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ILoginResponse, IUserProfileResponse } from '../../types/use-case/auth.types.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { permissionsFor } from '../../../domain/policies/permissions.policy.ts';

// Issues tokens for `user` and builds the session response the frontend stores.
// Shared by login, refresh, activation and password/email changes. Pass `familyId`
// when rotating, so the new refresh token joins the existing session family.
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
      username: user.username,
      role: user.role,
      // The UI shows and hides features from this list; the API still checks every call
      permissions: permissionsFor(user.role),
    },
  };
};

// The signed-in user's own profile, as /me and profile updates return it
export const toUserProfile = (user: User): IUserProfileResponse => {
  const snapshot = user.toSnapshot();
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    permissions: permissionsFor(user.role),
    status: user.status,
    isEmailVerified: snapshot.isEmailVerified,
    lastLoginAt: snapshot.lastLoginAt,
    createdAt: snapshot.createdAt,
  };
};
