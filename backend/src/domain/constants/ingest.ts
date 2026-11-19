// Ingest API keys. A key reads `siemple_ik_` + 64 hex characters, so secret scanners and people
// can tell what it is; the first INGEST_KEY_PREFIX_LENGTH characters are stored in clear to
// tell keys apart in a list.
export const INGEST_KEY_PREFIX = 'siemple_ik_';
export const INGEST_KEY_PREFIX_LENGTH = 16;

// A key's name becomes the Loki `source` label on everything sent with it, so it is kept short
// and label-safe: lowercase letters, digits, dot, dash and underscore, starting with a letter or
// digit.
export const INGEST_KEY_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

// Each active key is a separate set of log streams in Loki; capping them keeps Loki's index small.
export const MAX_ACTIVE_INGEST_KEYS = 100;

// POST /api/ingest. The body limit (1 MB, also nginx's) bounds a request; these bound what's in
// it, and keep every event inside what Loki accepts (it refuses lines older than a week or more
// than a few minutes ahead, and very long lines), so a batch is checked here instead of failing
// in Loki.
export const INGEST_LIMITS = {
  BODY_LIMIT: '1mb',
  MAX_EVENTS: 1000,
  MAX_MESSAGE_LENGTH: 32_768,
  MAX_FIELDS: 100,
  MAX_FIELD_NAME_LENGTH: 128,
  // The whole stored line: message plus fields, as JSON.
  MAX_LINE_BYTES: 65_536,
  MAX_AGE_DAYS: 7,
  MAX_FUTURE_MINUTES: 10,
  // Per key, per minute.
  REQUESTS_PER_MINUTE: 600,
  // Rejected requests (bad key, bad body) per address, per 15 minutes.
  FAILURES_PER_15_MIN: 60,
  // last_used_at is written at most this often per key, not on every request.
  LAST_USED_RESOLUTION_MS: 60_000,
} as const;

export const INGEST_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
export type IngestLevel = (typeof INGEST_LEVELS)[number];

// The Loki label that marks events sent through the ingest API, next to `source` (the key's name).
export const INGEST_SERVICE_LABEL = 'ingest';
