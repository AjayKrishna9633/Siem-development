
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  Index 
} from 'typeorm';
import type { UserRole, UserStatus } from '../../../domain/types/user.types.js';

@Entity({ name: 'users' })
export class UserModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;


    @Index()
    @Column({ type: 'uuid', name: 'organization_id', nullable: true })
    organizationId!: string | null;

    @Column({ type: 'varchar', unique: true })
    email!: string;

    @Column({ type: 'varchar' })
    username!: string;

    @Column({ type: 'varchar', name: 'password_hash', nullable: true })
    passwordHash!: string | null;

    @Column({ type: 'enum', enum: ['super_admin', 'org_admin', 'analyst'] })
    role!: UserRole;

    @Column({ type: 'enum', enum: ['invited', 'active', 'disabled'], default: 'invited' })
    status!: UserStatus;

    @Column({ type: 'boolean', name: 'is_email_verified', default: false })
    isEmailVerified!: boolean;

    @Column({ type: 'int', name: 'token_version', default: 0 })
    tokenVersion!: number;

    @Column({ type: 'int', name: 'failed_login_attempts', default: 0 })
    failedLoginAttempts!: number;

    @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
    lockedUntil!: Date | null;

    @Column({ type: 'timestamptz', name: 'password_changed_at', nullable: true })
    passwordChangedAt!: Date | null;

    @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
    lastLoginAt!: Date | null;

   
    @Column({ type: 'varchar', length: 45, name: 'last_login_ip', nullable: true })
    lastLoginIp!: string | null;

    @Column({ type: 'uuid', name: 'invited_by_id', nullable: true })
    invitedById!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}