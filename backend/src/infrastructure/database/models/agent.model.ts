import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'agents' })
export class AgentModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_agents_wazuh_id', { unique: true })
  @Column({ type: 'varchar', length: 16, name: 'wazuh_id' })
  wazuhId!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'varchar', length: 128, name: 'os_name', nullable: true })
  osName!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'os_platform', nullable: true })
  osPlatform!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'os_version', nullable: true })
  osVersion!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  version!: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  groups!: string[];

  @Column({ type: 'timestamptz', name: 'registered_at', nullable: true })
  registeredAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'last_keepalive_at', nullable: true })
  lastKeepAliveAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'removed_at', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
