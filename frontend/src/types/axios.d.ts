import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipGlobalError?: boolean;
  }
}
