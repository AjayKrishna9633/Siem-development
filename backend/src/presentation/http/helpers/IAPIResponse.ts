export interface IApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
}