import { DomainError } from '../errors/DomainError.js';
import type { UserProps, UserRole, UserStatus } from '../types/user.types.js';
import type { CreateSuperAdminDTO, CreateInvitedDTO } from '../../application/dtos/user.dto.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export class User {
  private constructor(private props: UserProps) {}

 
  static createInvited(input: CreateInvitedDTO): User {
    return new User({
      id: input.id,
      organizationId: input.organizationId,
      email: input.email.trim().toLowerCase(),
      username: input.username.trim(),
      passwordHash: null,
      role: input.role,
      status: 'invited',
      isEmailVerified: false,
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: null,
      lastLoginAt: null,
      lastLoginIp: null,
      invitedById: input.invitedById,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

 
  static reconstitute(props: UserProps): User {
    return new User({ ...props });
  }

  get id() { return this.props.id; }
  get email() { return this.props.email; }
  get role() { return this.props.role; }
  get status() { return this.props.status; }
  get organizationId() { return this.props.organizationId; }
  get passwordHash() { return this.props.passwordHash; }
  get tokenVersion() { return this.props.tokenVersion; }


  static createSuperAdmin(input: CreateSuperAdminDTO): User {
    return new User({
    id: input.id,
    organizationId: null,
    email: input.email.trim().toLowerCase(),
    username: input.username.trim(),
    passwordHash: input.passwordHash,
    role: 'super_admin',
    status: 'active',
    isEmailVerified: true,
    tokenVersion: 0,
    failedLoginAttempts: 0,
    lockedUntil: null,
    passwordChangedAt: input.now,
    lastLoginAt: null,
    lastLoginIp: null,
    invitedById: null,
    createdAt: input.now,
    updatedAt: input.now,
    });
  }


  toSnapshot(): Readonly<UserProps> {
    return { ...this.props };
  }

  isLocked(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now;
  }

  canLogIn(now: Date): boolean {
    return this.props.status === 'active' && this.props.passwordHash !== null && !this.isLocked(now);
  }

  acceptInvite(passwordHash: string, now: Date): void {
    if (this.props.status !== 'invited') throw new DomainError('Invite already used or user disabled');
    this.props.passwordHash = passwordHash;
    this.props.status = 'active';
    this.props.isEmailVerified = true; 
    this.props.passwordChangedAt = now;
    this.touch(now);
  }

  recordFailedLogin(now: Date): void {
    this.props.failedLoginAttempts += 1;
    if (this.props.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      this.props.lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60_000);
      this.props.failedLoginAttempts = 0;
    }
    this.touch(now);
  }

  recordSuccessfulLogin(ip: string | null, now: Date): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.lastLoginAt = now;
    this.props.lastLoginIp = ip;
    this.touch(now);
  }

  changePassword(newHash: string, now: Date): void {
    this.props.passwordHash = newHash;
    this.props.passwordChangedAt = now;
    this.props.tokenVersion += 1; 
    this.touch(now);
  }

  changeRole(newRole: Exclude<UserRole, 'super_admin'>, now: Date): void {
    if (this.props.role === 'super_admin') throw new DomainError('Super admin role cannot be changed');
    this.props.role = newRole;
    this.props.tokenVersion += 1;
    this.touch(now);
  }

  disable(now: Date): void {
    this.props.status = 'disabled';
    this.props.tokenVersion += 1;
    this.touch(now);
  }


  updateProfile(input: { username?: string }, now: Date): void {
    if (input.username !== undefined) this.props.username = input.username.trim();
    this.touch(now);
  }

  private touch(now: Date): void {
    this.props.updatedAt = now;
  }
}