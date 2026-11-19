import { z } from 'zod';
import {
  INGEST_KEY_NAME_PATTERN,
  INGEST_LEVELS,
  INGEST_LIMITS,
} from '../../domain/constants/ingest.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

export const createIngestKeySchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(INGEST_KEY_NAME_PATTERN, ErrorMessage.INGEST_KEY_NAME_INVALID),
});

const DAY_MS = 86_400_000;

// ISO 8601 with a time zone, or milliseconds since 1970. Missing: the time it arrives.
const timestampField = z
  .union([z.iso.datetime({ offset: true }), z.number().int().positive()])
  .optional()
  .transform((value) => (value === undefined ? new Date() : new Date(value)))
  .refine((date) => !Number.isNaN(date.getTime()), 'Not a valid time')
  .refine(
    (date) => date.getTime() >= Date.now() - INGEST_LIMITS.MAX_AGE_DAYS * DAY_MS,
    `More than ${INGEST_LIMITS.MAX_AGE_DAYS} days old; log storage does not accept it`,
  )
  .refine(
    (date) => date.getTime() <= Date.now() + INGEST_LIMITS.MAX_FUTURE_MINUTES * 60_000,
    `More than ${INGEST_LIMITS.MAX_FUTURE_MINUTES} minutes in the future; check the sender's clock`,
  );

const ingestEventSchema = z.object({
  timestamp: timestampField,
  level: z.enum(INGEST_LEVELS).default('info'),
  message: z.string().min(1, 'Message is required').max(INGEST_LIMITS.MAX_MESSAGE_LENGTH),
  // Free-form values kept inside the stored line (searchable in Grafana with `| json`).
  fields: z
    .record(z.string().min(1).max(INGEST_LIMITS.MAX_FIELD_NAME_LENGTH), z.json())
    .refine(
      (fields) => Object.keys(fields).length <= INGEST_LIMITS.MAX_FIELDS,
      `At most ${INGEST_LIMITS.MAX_FIELDS} fields per event`,
    )
    .optional(),
});

export const ingestEventsSchema = z.object({
  events: z
    .array(ingestEventSchema)
    .min(1, 'Send at least one event')
    .max(INGEST_LIMITS.MAX_EVENTS, `At most ${INGEST_LIMITS.MAX_EVENTS} events per request`),
});
