import type { IUser, Permission } from '../types/auth.ts';

// The backend sends each user's permissions with the session. The UI only uses them
// to show or hide things; every API call is still checked on the server.
export const can = (user: IUser | null | undefined, permission: Permission): boolean =>
  !!user?.permissions?.includes(permission);

// Where a user lands after sign-in
export const homePathFor = (user: IUser): string =>
  can(user, 'users.manage') ? '/users' : '/profile';
