import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import type { AuditMetadata } from '../../../application/interfaces/repositories/audit-log.repository.interface.ts';

@Entity({ name: 'audit_logs' })
export class AuditLogModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'varchar', length: 32, name: 'target_type', nullable: true })
  targetType!: string | null;

  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: AuditMetadata;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
