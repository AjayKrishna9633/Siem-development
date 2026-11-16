import type { AuditJson, AuditMetadata } from '../types/audit.types.ts';

export const REDACTED = '[REDACTED]';

const SENSITIVE_KEY = /password|token|secret|authorization|cookie/i;

// Keys that match the pattern above but hold no secret. Kept deliberately short: every entry is
// a hole in the redaction, so add one only with a test that says why.
const SAFE_KEYS: ReadonlySet<string> = new Set(['tokenversion', 'passwordchangedat']);

// A cyclic or absurdly deep value would otherwise overflow the stack inside the audit path.
const MAX_DEPTH = 8;
const TRUNCATED = '[TRUNCATED]';

const isSensitive = (key: string): boolean =>
  SENSITIVE_KEY.test(key) && !SAFE_KEYS.has(key.toLowerCase());

const redact = (value: AuditJson, depth: number): AuditJson => {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return TRUNCATED;

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const clean: { [key: string]: AuditJson } = {};
  for (const [key, child] of Object.entries(value)) {
    clean[key] = isSensitive(key) ? REDACTED : redact(child, depth + 1);
  }
  return clean;
};

// Returns a copy; the caller's object is never modified. Only keys are inspected, never values,
// so a value that merely mentions a password is stored as written.
export const redactMetadata = (metadata: AuditMetadata): AuditMetadata =>
  redact(metadata, 0) as AuditMetadata;
