import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set when the caller shows this request's errors itself, so no global toast appears. */
    skipGlobalError?: boolean;
  }
}
