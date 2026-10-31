import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { UserModel } from './user.model.ts';

// Single-use links (invites, password resets). Only the SHA-256 of the token is stored,
// so a database dump can't be turned into working links.
@Entity({ name: 'auth_tokens' })
@Index(['userId', 'type'])
export class AuthTokenModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  // Deleting a user (e.g. revoking an invite) deletes their links with them
  @ManyToOne(() => UserModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserModel;

  @Column({ type: 'enum', enum: AuthTokenType })
  type!: AuthTokenType;

  // Lookups go by hash, and the unique index makes a collision impossible to store
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  // Set once, atomically, when the link is used
  @Column({ type: 'timestamptz', name: 'used_at', nullable: true })
  usedAt!: Date | null;

  // The admin who issued it; null for self-service ("forgot password")
  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
