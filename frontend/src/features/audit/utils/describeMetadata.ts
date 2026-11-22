import { CHANGED_FIELD_BY_ACTION, humanize } from '../constants/actionLabels.ts';
import type { AuditJson, AuditMetadata } from '../types/audit.types.ts';

export interface IChange {
  field: string;
  before: AuditJson | undefined;
  after: AuditJson | undefined;
}

export interface IMetadataView {
  changes: IChange[];
  details: { key: string; value: AuditJson }[];
}

const isRecord = (value: AuditJson | undefined): value is { [key: string]: AuditJson } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const describeMetadata = (action: string, metadata: AuditMetadata): IMetadataView => {
  const changes: IChange[] = [];
  const consumed = new Set<string>();

  const { before, after } = metadata;
  if (isRecord(before) && isRecord(after)) {
    consumed.add('before').add('after');
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    for (const field of fields) {
      changes.push({ field: humanize(field), before: before[field], after: after[field] });
    }
  }

  if ('from' in metadata && 'to' in metadata) {
    consumed.add('from').add('to');
    changes.push({
      field: CHANGED_FIELD_BY_ACTION[action] ?? 'Value',
      before: metadata.from,
      after: metadata.to,
    });
  }

  return {
    changes,
    details: Object.entries(metadata)
      .filter(([key]) => !consumed.has(key))
      .map(([key, value]) => ({ key, value })),
  };
};

export const formatValue = (value: AuditJson | undefined): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value === '' ? '(empty)' : value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
