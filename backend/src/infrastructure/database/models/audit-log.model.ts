import { Entity, PrimaryGeneratedColumn, Column, Index, Check } from 'typeorm';
import type { AuditCategory } from '../../../domain/enums/AuditCategory.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';

// The (occurred_at DESC, id DESC) ordering lives in the migration because TypeORM can't express
// descending index columns. category and outcome are varchar + CHECK on purpose, so a new
// category is a one-line migration rather than an ALTER TYPE. The CHECK names are declared here
// so `migration:check` sees the model and the database agree.
@Entity({ name: 'audit_logs' })
@Check(
  'CHK_audit_logs_category',
  `"category" IN ('auth', 'user', 'system', 'agent', 'rule', 'alert')`,
)
@Check('CHK_audit_logs_outcome', `"outcome" IN ('success', 'failure', 'denied')`)
@Index('IDX_audit_logs_occurred_at', ['occurredAt', 'id'])
@Index('IDX_audit_logs_actor_occurred_at', ['actorId', 'occurredAt'])
export class AuditLogModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Set by the database, never by the application, so a client or bug can't backdate a row.
  @Column({ type: 'timestamptz', name: 'occurred_at', default: () => 'clock_timestamp()' })
  occurredAt!: Date;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId!: string | null;

  // Copied in at write time so the row stays readable after the user is renamed or removed.
  @Column({ type: 'varchar', length: 255, name: 'actor_username', nullable: true })
  actorUsername!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'actor_role', nullable: true })
  actorRole!: string | null;

  @Index('IDX_audit_logs_action')
  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Index('IDX_audit_logs_category')
  @Column({ type: 'varchar', length: 16 })
  category!: AuditCategory;

  @Column({ type: 'varchar', length: 16 })
  outcome!: AuditOutcome;

  @Column({ type: 'varchar', length: 32, name: 'target_type', nullable: true })
  targetType!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'target_id', nullable: true })
  targetId!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'target_label', nullable: true })
  targetLabel!: string | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 128, name: 'request_id', nullable: true })
  requestId!: string | null;

  // Typed loosely on purpose: AuditMetadata is recursive, and TypeORM's deep-partial insert types
  // give up on it ("type instantiation is excessively deep"), while `unknown` isn't accepted at
  // all. Writes are typed by IAuditRecord; reads are narrowed back to AuditMetadata in the mapper.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, string | number | boolean | object | null>;
}
