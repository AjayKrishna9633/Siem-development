import type { IngestLevel } from '../../../domain/constants/ingest.ts';
import type { AuditJson } from '../../../domain/types/audit.types.ts';

// The key an ingest request was authenticated with.
export interface IIngestKeyIdentity {
  id: string;
  name: string;
}

// One event as the validator hands it over: timestamp resolved, level defaulted.
export interface IIngestEvent {
  timestamp: Date;
  level: IngestLevel;
  message: string;
  fields?: Record<string, AuditJson>;
}

export interface IIngestResult {
  accepted: number;
}
