import type { IAuditActor } from '../../../domain/types/audit.types.ts';

export interface IRequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface IRequestScope {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
  actor: IAuditActor | null;
}

export interface IRequestContextProvider {
  run<T>(scope: IRequestScope, fn: () => T): T;
  current(): IRequestScope | undefined;
  setActor(actor: IAuditActor): void;
}
