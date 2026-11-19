import type { IIngestResult } from '../../../types/use-case/ingest.types.ts';

export interface IIngestResultDto {
  accepted: number;
}

export const toIngestResultDto = (result: IIngestResult): IIngestResultDto => ({
  accepted: result.accepted,
});
