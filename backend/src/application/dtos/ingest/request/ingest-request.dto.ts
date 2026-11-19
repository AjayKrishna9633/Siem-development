import type { IIngestEvent, IIngestKeyIdentity } from '../../../types/use-case/ingest.types.ts';

export interface IAuthenticateIngestKeyInput {
  // Whatever followed "Bearer " in the Authorization header.
  secret: string;
}

export interface IIngestEventsInput {
  key: IIngestKeyIdentity;
  events: IIngestEvent[];
  // Stored with each event, so it can be matched to the API's own log line for the request.
  requestId: string | null;
}
