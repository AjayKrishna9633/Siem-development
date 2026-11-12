import type { ILoginResponse } from '../../../types/use-case/auth.types.ts';

export interface ISessionUserDto {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface ISessionResponseDto {
  accessToken: string;
  user: ISessionUserDto;
}

export const toSessionResponse = (session: ILoginResponse): ISessionResponseDto => ({
  accessToken: session.accessToken,
  user: {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    role: session.user.role,
    permissions: session.user.permissions,
  },
});
