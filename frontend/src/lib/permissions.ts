import type { IUser, Permission } from '../types/auth.ts';

export const can = (user: IUser | null | undefined, permission: Permission): boolean =>
  !!user?.permissions?.includes(permission);

export const homePathFor = (user: IUser): string =>
  can(user, 'users.manage') ? '/users' : '/profile';
