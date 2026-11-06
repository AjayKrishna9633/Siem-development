import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Check } from 'typeorm';

@Entity({ name: 'system_settings' })
@Check('CHK_system_settings_single_row', '"id" = 1')
export class SystemSettingsModel {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id!: number;

  @Column({ type: 'boolean', name: 'setup_completed', default: false })
  setupCompleted!: boolean;

  @Column({ type: 'varchar', length: 64, name: 'setup_token_hash', nullable: true })
  setupTokenHash!: string | null;

  @Column({ type: 'timestamptz', name: 'setup_token_expires_at', nullable: true })
  setupTokenExpiresAt!: Date | null;

  @Column({ type: 'varchar', length: 150, name: 'org_name', nullable: true })
  orgName!: string | null;

  @Column({ type: 'varchar', length: 2048, name: 'base_url', nullable: true })
  baseUrl!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
