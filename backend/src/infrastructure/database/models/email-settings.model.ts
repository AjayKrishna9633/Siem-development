import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserModel } from './user.model.ts';

export const EMAIL_SETTINGS_ROW_ID = 1;

@Entity({ name: 'email_settings' })
@Check('CHK_email_settings_single_row', '"id" = 1')
@Check('CHK_email_settings_security', `"security" IN ('none', 'starttls', 'tls')`)
@Check('CHK_email_settings_port', '"port" BETWEEN 1 AND 65535')
export class EmailSettingsModel {
  @PrimaryColumn({ type: 'smallint', default: EMAIL_SETTINGS_ROW_ID })
  id!: number;

  @Column({ type: 'varchar', length: 253, nullable: true })
  host!: string | null;

  @Column({ type: 'integer', nullable: true })
  port!: number | null;

  @Column({ type: 'varchar', length: 16, default: 'starttls' })
  security!: string;

  @Column({ type: 'varchar', length: 320, nullable: true })
  username!: string | null;

  // AES-256-GCM, base64. Never the plain password.
  @Column({ type: 'text', name: 'password_ciphertext', nullable: true })
  passwordCiphertext!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'password_iv', nullable: true })
  passwordIv!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'password_auth_tag', nullable: true })
  passwordAuthTag!: string | null;

  @Column({ type: 'smallint', name: 'key_version', nullable: true })
  keyVersion!: number | null;

  @Column({ type: 'varchar', length: 320, name: 'from_address', nullable: true })
  fromAddress!: string | null;

  @Column({ type: 'varchar', length: 120, name: 'from_name', nullable: true })
  fromName!: string | null;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'timestamptz', name: 'last_test_at', nullable: true })
  lastTestAt!: Date | null;

  @Column({ type: 'boolean', name: 'last_test_ok', nullable: true })
  lastTestOk!: boolean | null;

  @Column({ type: 'varchar', length: 200, name: 'last_test_error', nullable: true })
  lastTestError!: string | null;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy!: string | null;

  @ManyToOne(() => UserModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserModel;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
