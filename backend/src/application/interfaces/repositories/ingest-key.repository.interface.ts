// An ingest key as stored, minus its hash: nothing outside the repository needs the hash back.
export interface IIngestKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
}

// What an ingest request needs to know about the key it was sent with.
export interface IActiveIngestKey {
  id: string;
  name: string;
  lastUsedAt: Date | null;
}

export interface INewIngestKey {
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdBy: string | null;
}

export interface IIngestKeyRepository {
  create(key: INewIngestKey): Promise<IIngestKeyRecord>;
  // Newest first, revoked keys included.
  findAll(): Promise<IIngestKeyRecord[]>;
  findActiveByName(name: string): Promise<IIngestKeyRecord | null>;
  countActive(): Promise<number>;
  findActiveByHash(keyHash: string): Promise<IActiveIngestKey | null>;
  touchLastUsed(id: string, now: Date): Promise<void>;
  // Returns the revoked key, or null when there is no active key with this id.
  revoke(id: string, revokedBy: string | null, now: Date): Promise<IIngestKeyRecord | null>;
}
