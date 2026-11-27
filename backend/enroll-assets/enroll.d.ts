// Types for the enrollment page script, so the tests can import its pure parts.
export declare const POLL_INTERVAL_MS: number;
export declare const USED_MESSAGE: string;
export declare const CONNECTED_MESSAGE: string;
export declare const EXPIRED_MESSAGE: string;

export declare const detectOs: (userAgent: string, fallback: string) => string;
export declare const detectArch: (userAgent: string, fallback: string) => string;

export interface IStatusResponse {
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
}

export interface IStatusPollingOptions {
  url: string;
  onConnected: () => void;
  onGone: () => void;
  fetchFn?: (url: string, init: object) => Promise<IStatusResponse>;
  schedule?: (callback: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
  intervalMs?: number;
}

export declare const startStatusPolling: (options: IStatusPollingOptions) => {
  stop: () => void;
  tick: () => Promise<void>;
};
