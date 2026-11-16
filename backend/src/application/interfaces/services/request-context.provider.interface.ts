import type { IAuditActor } from '../../../domain/types/audit.types.ts';

// What a few use cases still need from the request itself (the sign-in IP to remember on the
// user). Audit data no longer travels this way; AuditService reads it from IRequestScope.
export interface IRequestContext {
  ip: string | null;
  userAgent: string | null;
}

// What is known about the request being served, for anything that needs it without being handed
// the Express request: today that is only the audit log.
export interface IRequestScope {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
  // null until authenticate() has verified who is calling.
  actor: IAuditActor | null;
}

export interface IRequestContextProvider {
  // Everything started inside fn, including awaited work, sees `scope` from current().
  run<T>(scope: IRequestScope, fn: () => T): T;
  // undefined outside a request (CLI commands, background work).
  current(): IRequestScope | undefined;
  setActor(actor: IAuditActor): void;
}
