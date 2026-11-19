// An ingest key as admins see it. Never includes the key itself or its hash.
export interface IIngestKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  active: boolean;
}

export interface ICreatedIngestKey {
  key: IIngestKey;
  // The full key. Returned only here, once; only its hash is stored.
  secret: string;
}
