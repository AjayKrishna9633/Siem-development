export interface ILoginInput {
  email: string;
  password: string;
  ip?: string | null;
}
export type LoginInput = ILoginInput;

export interface ILoginResponse {
  accessToken: string;
  // Delivered as an httpOnly cookie by the controller, never in the JSON body
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    permissions: string[];
  };
}
export type LoginResponse = ILoginResponse;

export interface IUserProfileResponse {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  status: string;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}
export type UserProfileResponse = IUserProfileResponse;
