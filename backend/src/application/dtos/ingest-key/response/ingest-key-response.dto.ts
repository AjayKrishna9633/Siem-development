import type { ICreatedIngestKey, IIngestKey } from '../../../types/use-case/ingest-key.types.ts';
import { iso, isoOrNull } from '../../dates.ts';

export interface IIngestKeyDto {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  active: boolean;
}

export interface ICreatedIngestKeyDto {
  key: IIngestKeyDto;
  secret: string;
}

export const toIngestKeyDto = (key: IIngestKey): IIngestKeyDto => ({
  id: key.id,
  name: key.name,
  keyPrefix: key.keyPrefix,
  createdBy: key.createdBy,
  createdAt: iso(key.createdAt),
  lastUsedAt: isoOrNull(key.lastUsedAt),
  revokedAt: isoOrNull(key.revokedAt),
  revokedBy: key.revokedBy,
  active: key.active,
});

export const toCreatedIngestKeyDto = (created: ICreatedIngestKey): ICreatedIngestKeyDto => ({
  key: toIngestKeyDto(created.key),
  secret: created.secret,
});
