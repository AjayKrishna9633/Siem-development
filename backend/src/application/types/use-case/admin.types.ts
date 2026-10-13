export interface IBootstrapSuperAdminInput {
  setupToken: string;
  email: string;
  username: string;
  password: string;
}
export type BootstrapSuperAdminInput = IBootstrapSuperAdminInput;

export interface IRegisterSuperAdminInput {
  email: string;
  username: string;
  password: string;
}
export type RegisterSuperAdminInput = IRegisterSuperAdminInput;
