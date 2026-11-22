import { AsyncLocalStorage } from 'node:async_hooks';
import { injectable } from 'inversify';
import type {
  IRequestContextProvider,
  IRequestScope,
} from '../../application/interfaces/services/request-context.provider.interface.ts';
import type { IAuditActor } from '../../domain/types/audit.types.ts';

@injectable()
export class AsyncRequestContext implements IRequestContextProvider {
  private readonly _storage = new AsyncLocalStorage<IRequestScope>();

  run<T>(scope: IRequestScope, fn: () => T): T {
    return this._storage.run(scope, fn);
  }

  current(): IRequestScope | undefined {
    return this._storage.getStore();
  }

  setActor(actor: IAuditActor): void {
    const scope = this._storage.getStore();
    if (scope) scope.actor = actor;
  }
}
