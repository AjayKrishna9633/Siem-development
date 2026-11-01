// Structured fields logged next to the message. Pass an error as `err` so its stack and
// cause are kept. Secrets never belong here, but known secret field names are masked anyway.
export type LogFields = Record<string, unknown>;

export interface ILogger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  // A logger that adds these fields to every entry, e.g. { module: 'email' }
  child(bindings: LogFields): ILogger;
}
