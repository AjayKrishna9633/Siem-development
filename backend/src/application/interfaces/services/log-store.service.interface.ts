// Where log events are kept (Loki). Writes either store the whole batch or throw an AppError:
// LOG_STORE_UNAVAILABLE when it can't be reached (the caller may retry), LOG_STORE_REJECTED when
// it refused the events themselves.

export interface ILogEntry {
  // Indexed values. Keep them few and from a small set: each distinct combination is a stream.
  labels: Record<string, string>;
  timestamp: Date;
  line: string;
  // Searchable per-entry values that are not labels (e.g. a request id).
  metadata?: Record<string, string>;
}

export interface ILogStoreService {
  push(entries: ILogEntry[]): Promise<void>;
}
