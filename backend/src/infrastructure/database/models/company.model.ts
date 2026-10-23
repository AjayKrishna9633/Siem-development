import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { CompanyStatus } from '../../../domain/enums/CompanyStatus.ts';

@Entity({ name: 'companies' })
export class CompanyModel {
  // Ids are assigned in the domain (users reference them via organization_id)
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.ACTIVE })
  status!: CompanyStatus;

  @Column({ type: 'uuid', name: 'admin_user_id', nullable: true })
  adminUserId!: string | null;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById!: string | null;

  @Column({ type: 'timestamptz', name: 'deactivated_at', nullable: true })
  deactivatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
