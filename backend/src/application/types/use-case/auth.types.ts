export interface ISendOtpInput {
  email: string;
  type: 'signup' | 'reset';
}
export type SendOtpInput = ISendOtpInput;

export interface IVerifyOtpInput {
  email: string;
  otp: string;
  type: 'signup' | 'reset';
}
export type VerifyOtpInput = IVerifyOtpInput;

export interface ILoginInput {
  email: string;
  password: string;
  ip?: string | null;
}
export type LoginInput = ILoginInput;

export interface ILoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    organizationId: string | null;
  };
}
export type LoginResponse = ILoginResponse;

export interface IUserProfileResponse {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  organizationId: string | null;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}
export type UserProfileResponse = IUserProfileResponse;
