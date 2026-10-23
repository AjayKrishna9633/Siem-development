import type { CompanyProps } from '../types/company.types.ts';
import { CompanyStatus } from '../enums/CompanyStatus.ts';

export class Company {
  private constructor(private props: CompanyProps) {}

  static create(input: {
    id: string;
    name: string;
    createdById: string | null;
    now: Date;
  }): Company {
    return new Company({
      id: input.id,
      name: input.name.trim(),
      status: CompanyStatus.ACTIVE,
      adminUserId: null,
      createdById: input.createdById,
      deactivatedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstitute(props: CompanyProps): Company {
    return new Company({ ...props });
  }

  get id() {
    return this.props.id;
  }
  get name() {
    return this.props.name;
  }
  get status() {
    return this.props.status;
  }
  get adminUserId() {
    return this.props.adminUserId;
  }
  get isActive() {
    return this.props.status === CompanyStatus.ACTIVE;
  }

  toSnapshot(): Readonly<CompanyProps> {
    return { ...this.props };
  }

  rename(name: string, now: Date): void {
    this.props.name = name.trim();
    this.touch(now);
  }

  assignAdmin(userId: string, now: Date): void {
    this.props.adminUserId = userId;
    this.touch(now);
  }

  // Deactivation blocks sign-in for every member; nothing is deleted
  deactivate(now: Date): void {
    this.props.status = CompanyStatus.DEACTIVATED;
    this.props.deactivatedAt = now;
    this.touch(now);
  }

  reactivate(now: Date): void {
    this.props.status = CompanyStatus.ACTIVE;
    this.props.deactivatedAt = null;
    this.touch(now);
  }

  private touch(now: Date): void {
    this.props.updatedAt = now;
  }
}
