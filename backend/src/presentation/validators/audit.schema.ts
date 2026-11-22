import { z } from 'zod';
import { AUDIT_QUERY_LIMITS } from '../../domain/constants/audit.ts';
import { AuditCategory } from '../../domain/enums/AuditCategory.ts';
import { AuditOutcome } from '../../domain/enums/AuditOutcome.ts';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  );

const dateField = z.iso
  .datetime({ offset: true, error: 'Use an ISO 8601 date and time, e.g. 2026-11-14T10:00:00Z' })
  .transform((value) => new Date(value));

const filterShape = {
  from: optional(dateField),
  to: optional(dateField),
  actorId: optional(z.uuid('actorId must be a valid user id')),
  category: optional(z.enum(AuditCategory, 'Unknown category')),
  outcome: optional(z.enum(AuditOutcome, 'Unknown outcome')),
  action: optional(
    z
      .string()
      .trim()
      .max(64)
      .regex(/^[a-z0-9_.]+$/, 'An action is lowercase letters, digits, dots and underscores'),
  ),
  q: optional(z.string().trim().max(100)),
};

export const listAuditLogsQuerySchema = z.object({
  ...filterShape,
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(AUDIT_QUERY_LIMITS.MAX_PAGE_SIZE)
    .default(AUDIT_QUERY_LIMITS.DEFAULT_PAGE_SIZE),
  cursor: optional(z.string().max(512)),
});

export const exportAuditLogsQuerySchema = z.object({
  ...filterShape,
  format: z.literal('csv', 'Only csv export is supported').default('csv'),
});
