import { DomainError } from '../errors/DomainError.ts';
import type {
  ICreateFirstAdminProps,
  ICreateInvitedUserProps,
  UserProps,
} from '../types/user.types.ts';
import { UserRole } from '../enums/UserRole.ts';
import { UserStatus } from '../enums/UserStatus.ts';
import { LOGIN_LOCKOUT } from '../constants/security.ts';
import { normalizeEmail } from '../policies/credentials.policy.ts';
import { ErrorMessage } from '../enums/ErrorMessage.ts';

export class User {
  private constructor(private props: UserProps) {}

  static createInvited(input: ICreateInvitedUserProps): User {
    return new User({
      id: input.id,
      email: normalizeEmail(input.email),
      username: null,
      passwordHash: null,
      role: input.role,
      status: UserStatus.INVITED,
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

  static createFirstAdmin(input: ICreateFirstAdminProps): User {
    return new User({
      id: input.id,
      email: normalizeEmail(input.email),
      username: input.username.trim(),
      passwordHash: input.passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
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

  static reconstitute(props: UserProps): User {
    return new User({ ...props });
  }

  get id() {
    return this.props.id;
  }
  get email() {
    return this.props.email;
  }
  get username() {
    return this.props.username;
  }
  get displayName(): string {
    return this.props.username ?? this.props.email;
  }
  get role() {
    return this.props.role;
  }
  get status() {
    return this.props.status;
  }
  get passwordHash() {
    return this.props.passwordHash;
  }
  get tokenVersion() {
    return this.props.tokenVersion;
  }
  get isActiveAdmin() {
    return this.props.role === UserRole.ADMIN && this.props.status === UserStatus.ACTIVE;
  }

  toSnapshot(): Readonly<UserProps> {
    return { ...this.props };
  }

  isLocked(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now;
  }

  canLogIn(now: Date): boolean {
    return (
      this.props.status === UserStatus.ACTIVE &&
      this.props.passwordHash !== null &&
      !this.isLocked(now)
    );
  }

  acceptInvite(username: string, passwordHash: string, now: Date): void {
    if (this.props.status !== UserStatus.INVITED)
      throw new DomainError(ErrorMessage.INVITE_ALREADY_USED_OR_DISABLED);
    this.props.username = username.trim();
    this.props.passwordHash = passwordHash;
    this.props.status = UserStatus.ACTIVE;
    this.props.isEmailVerified = true;
    this.props.passwordChangedAt = now;
    this.touch(now);
  }

  recordFailedLogin(now: Date): void {
    this.props.failedLoginAttempts += 1;
    if (this.props.failedLoginAttempts >= LOGIN_LOCKOUT.MAX_FAILED_ATTEMPTS) {
      this.props.lockedUntil = new Date(now.getTime() + LOGIN_LOCKOUT.LOCK_MINUTES * 60_000);
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

  upgradePasswordHash(newHash: string): void {
    this.props.passwordHash = newHash;
  }

  resetPassword(newHash: string, now: Date): void {
    this.changePassword(newHash, now);
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
  }

  changeEmail(newEmail: string, now: Date): void {
    this.props.email = normalizeEmail(newEmail);
    this.props.isEmailVerified = true;
    this.props.tokenVersion += 1;
    this.touch(now);
  }

  changeRole(role: UserRole, now: Date): void {
    this.props.role = role;
    this.touch(now);
  }

  disable(now: Date): void {
    if (this.props.status === UserStatus.DISABLED) {
      throw new DomainError(ErrorMessage.USER_ALREADY_DISABLED);
    }
    this.props.status = UserStatus.DISABLED;
    this.props.tokenVersion += 1;
    this.touch(now);
  }

  enable(now: Date): void {
    if (this.props.status !== UserStatus.DISABLED) {
      throw new DomainError(ErrorMessage.USER_NOT_DISABLED);
    }
    this.props.status = this.props.passwordHash ? UserStatus.ACTIVE : UserStatus.INVITED;
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
