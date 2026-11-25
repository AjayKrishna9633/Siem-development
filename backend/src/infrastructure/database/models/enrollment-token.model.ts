import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PendingAgentModel } from './pending-agent.model.ts';

// One single-use link per pending agent. The enrollment service may only set used_at.
@Entity({ name: 'enrollment_tokens' })
export class EnrollmentTokenModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'pending_agent_id' })
  pendingAgentId!: string;

  @OneToOne(() => PendingAgentModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pending_agent_id' })
  pendingAgent?: PendingAgentModel;

  // SHA-256 of the link token, hex. The token itself is never stored.
  @Index('IDX_enrollment_tokens_token_hash', { unique: true })
  @Column({ type: 'char', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Index('IDX_enrollment_tokens_expires_at')
  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'used_at', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
