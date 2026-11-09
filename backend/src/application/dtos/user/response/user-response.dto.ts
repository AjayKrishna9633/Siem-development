import type { IUserProfileResponse } from '../../../types/use-case/auth.types.ts';
import type {
  IManagedUser,
  IUserCounts,
  IUserPage,
} from '../../../types/use-case/user-mgmt.types.ts';
import { iso, isoOrNull } from '../../dates.ts';

export interface IUserProfileDto {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  status: string;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface IManagedUserDto {
  id: string;
  email: string;
  username: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface IUserPageDto {
  items: IManagedUserDto[];
  page: number;
  pageSize: number;
  total: number;
  counts: IUserCounts;
}

export const toUserProfileDto = (profile: IUserProfileResponse): IUserProfileDto => ({
  id: profile.id,
  email: profile.email,
  username: profile.username,
  role: profile.role,
  permissions: profile.permissions,
  status: profile.status,
  isEmailVerified: profile.isEmailVerified,
  lastLoginAt: isoOrNull(profile.lastLoginAt),
  createdAt: iso(profile.createdAt),
});

export const toManagedUserDto = (user: IManagedUser): IManagedUserDto => ({
  id: user.id,
  email: user.email,
  username: user.username,
  role: user.role,
  status: user.status,
  createdAt: iso(user.createdAt),
  lastLoginAt: isoOrNull(user.lastLoginAt),
});

export const toUserPageDto = (page: IUserPage): IUserPageDto => ({
  items: page.items.map(toManagedUserDto),
  page: page.page,
  pageSize: page.pageSize,
  total: page.total,
  counts: { all: page.counts.all, invited: page.counts.invited, disabled: page.counts.disabled },
});
