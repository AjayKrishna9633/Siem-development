import type { IActor } from '../../../types/use-case/actor.types.ts';

// `actor` is null when the request comes from the `ingest-key` command on the server: whoever
// can run it already has a shell there, so there is no permission to check, and the audit entry
// names the system.
export interface ICreateIngestKeyInput {
  actor: IActor | null;
  name: string;
}

export interface IRevokeIngestKeyInput {
  actor: IActor | null;
  id: string;
}
