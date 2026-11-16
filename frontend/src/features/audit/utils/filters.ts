import { isUuid } from '@/utils/validation.ts';
import { CATEGORY_LABELS, OUTCOME_LABELS, RANGE_OPTIONS } from '../constants/actionLabels.ts';
import type {
  AuditCategory,
  AuditOutcome,
  AuditRange,
  IAuditFilters,
  IAuditQuery,
} from '../types/audit.types.ts';

export const DEFAULT_RANGE: AuditRange = '7d';
export const MAX_RANGE_DAYS = 90;
export const MAX_SEARCH_LENGTH = 100;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const PRESET_MS: Record<Exclude<AuditRange, 'custom'>, number> = {
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
};

const validDate = (value: string | null): string | undefined => {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

// The URL is typed by people and bookmarked for months, so nothing in it is trusted: an unknown
// category, a malformed date or a made-up actor id is dropped, never sent to the API.
export const filtersFromParams = (params: URLSearchParams): IAuditFilters => {
  const range = params.get('range');
  const category = params.get('category');
  const outcome = params.get('outcome');
  const actorId = params.get('actor');
  const q = params.get('q')?.trim().slice(0, MAX_SEARCH_LENGTH);

  const isCustom = range === 'custom';
  return {
    range: RANGE_OPTIONS.includes(range as AuditRange) ? (range as AuditRange) : DEFAULT_RANGE,
    ...(isCustom && { from: validDate(params.get('from')), to: validDate(params.get('to')) }),
    ...(category && category in CATEGORY_LABELS && { category: category as AuditCategory }),
    ...(outcome && outcome in OUTCOME_LABELS && { outcome: outcome as AuditOutcome }),
    ...(actorId && isUuid(actorId) && { actorId }),
    ...(q && { q }),
  };
};

// Defaults are left out so the URL stays short and a link to "everything" has no query string.
export const filtersToParams = (filters: IAuditFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.range !== DEFAULT_RANGE) params.set('range', filters.range);
  if (filters.range === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.category) params.set('category', filters.category);
  if (filters.outcome) params.set('outcome', filters.outcome);
  if (filters.actorId) params.set('actor', filters.actorId);
  if (filters.q) params.set('q', filters.q);
  return params;
};

// A preset becomes concrete dates only at the moment of the request, so Refresh moves "last 24
// hours" forward. Custom dates are used exactly as chosen.
export const toQuery = (filters: IAuditFilters, now: Date): IAuditQuery => {
  const range =
    filters.range === 'custom'
      ? { from: filters.from, to: filters.to }
      : {
          from: new Date(now.getTime() - PRESET_MS[filters.range]).toISOString(),
          to: now.toISOString(),
        };

  return {
    ...range,
    actorId: filters.actorId,
    category: filters.category,
    outcome: filters.outcome,
    q: filters.q,
  };
};

// Catches what the server would refuse, so the admin sees the reason next to the date fields
// instead of an error after a round trip. The server still enforces the same rule.
export const rangeError = (filters: IAuditFilters, now: Date): string | null => {
  if (filters.range !== 'custom') return null;

  const from = filters.from ? new Date(filters.from).getTime() : null;
  const to = filters.to ? new Date(filters.to).getTime() : now.getTime();
  const start = from ?? to - PRESET_MS['7d'];

  if (start >= to) return 'The start of the range must be before its end.';
  if (to - start > MAX_RANGE_DAYS * DAY_MS) {
    return `Choose a range of ${MAX_RANGE_DAYS} days or less.`;
  }
  return null;
};

export const hasActiveFilters = (filters: IAuditFilters): boolean =>
  filters.range !== DEFAULT_RANGE ||
  !!(filters.category || filters.outcome || filters.actorId || filters.q);

const pad = (n: number) => String(n).padStart(2, '0');

// <input type="datetime-local"> speaks local wall-clock time without a zone: "2026-11-14T09:30".
export const isoToLocalInput = (iso: string | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

export const localInputToIso = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
