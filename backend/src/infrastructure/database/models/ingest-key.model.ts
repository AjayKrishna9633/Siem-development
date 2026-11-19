import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserModel } from './user.model.ts';

// Constraint and index names match the CreateIngestKeys migration.
@Entity({ name: 'ingest_keys' })
@Index('IDX_ingest_keys_active_name', ['name'], { unique: true, where: '"revoked_at" IS NULL' })
export class IngestKeyModel {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_ingest_keys' })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 16, name: 'key_prefix' })
  keyPrefix!: string;

  @Index('IDX_ingest_keys_key_hash', { unique: true })
  @Column({ type: 'varchar', length: 64, name: 'key_hash' })
  keyHash!: string;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => UserModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'FK_ingest_keys_created_by' })
  creator?: UserModel | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'last_used_at', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'uuid', name: 'revoked_by', nullable: true })
  revokedBy!: string | null;

  @ManyToOne(() => UserModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'revoked_by', foreignKeyConstraintName: 'FK_ingest_keys_revoked_by' })
  revoker?: UserModel | null;
}
