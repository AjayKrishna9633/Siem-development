import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { AgentArch, AgentOs } from '../../../domain/enums/AgentOs.ts';
import { PendingAgentStatus } from '../../../domain/enums/PendingAgentStatus.ts';

// An agent registered in Wazuh ahead of time, waiting for the machine to pick up its key through
// a one-time enrollment link. Only the API writes here; the enrollment service may only read.
@Entity({ name: 'pending_agents' })
@Check('CHK_pending_agents_status', `"status" IN ('pending', 'connected', 'expired')`)
@Index('IDX_pending_agents_status_created_at', ['status', 'createdAt'])
export class PendingAgentModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 64, name: 'group_name' })
  groupName!: string;

  @Column({ type: 'enum', enum: AgentOs })
  os!: AgentOs;

  // Null for Windows, where one package covers both architectures.
  @Column({ type: 'enum', enum: AgentArch, nullable: true })
  arch!: AgentArch | null;

  // Resolved from the manager when the link is made; the install script installs this version.
  @Column({ type: 'varchar', length: 32, name: 'agent_version' })
  agentVersion!: string;

  @Index('IDX_pending_agents_wazuh_agent_id', { unique: true })
  @Column({ type: 'varchar', length: 16, name: 'wazuh_agent_id' })
  wazuhAgentId!: string;

  // AES-256-GCM with ENROLL_KEY_SECRET, base64. Never the plain Wazuh agent key.
  @Column({ type: 'text', name: 'agent_key_ciphertext' })
  agentKeyCiphertext!: string;

  @Column({ type: 'varchar', length: 32, name: 'agent_key_iv' })
  agentKeyIv!: string;

  @Column({ type: 'varchar', length: 32, name: 'agent_key_auth_tag' })
  agentKeyAuthTag!: string;

  @Column({ type: 'smallint', name: 'key_version' })
  keyVersion!: number;

  @Column({ type: 'varchar', length: 16, default: PendingAgentStatus.PENDING })
  status!: PendingAgentStatus;

  @Column({ type: 'timestamptz', name: 'connected_at', nullable: true })
  connectedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
