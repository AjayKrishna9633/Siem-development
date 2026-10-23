export interface ILogoutInput {
  refreshToken: string | null;
}

export interface ILogoutUseCase {
  execute(input: ILogoutInput): Promise<void>;
}
