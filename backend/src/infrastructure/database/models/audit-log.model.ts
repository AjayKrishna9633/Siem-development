import { Entity, PrimaryGeneratedColumn, Column, Index, Check } from 'typeorm';
import type { AuditCategory } from '../../../domain/enums/AuditCategory.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';

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

  @Column({ type: 'timestamptz', name: 'occurred_at', default: () => 'clock_timestamp()' })
  occurredAt!: Date;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId!: string | null;

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

  // Loose type: TypeORM can't handle the recursive AuditMetadata.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, string | number | boolean | object | null>;
}
