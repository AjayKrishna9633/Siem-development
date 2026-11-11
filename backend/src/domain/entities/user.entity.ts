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
  private constructor(private _props: UserProps) {}

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
    return this._props.id;
  }
  get email() {
    return this._props.email;
  }
  get username() {
    return this._props.username;
  }
  get displayName(): string {
    return this._props.username ?? this._props.email;
  }
  get role() {
    return this._props.role;
  }
  get status() {
    return this._props.status;
  }
  get passwordHash() {
    return this._props.passwordHash;
  }
  get tokenVersion() {
    return this._props.tokenVersion;
  }
  get isActiveAdmin() {
    return this._props.role === UserRole.ADMIN && this._props.status === UserStatus.ACTIVE;
  }

  toSnapshot(): Readonly<UserProps> {
    return { ...this._props };
  }

  isLocked(now: Date): boolean {
    return this._props.lockedUntil !== null && this._props.lockedUntil > now;
  }

  canLogIn(now: Date): boolean {
    return (
      this._props.status === UserStatus.ACTIVE &&
      this._props.passwordHash !== null &&
      !this.isLocked(now)
    );
  }

  acceptInvite(username: string, passwordHash: string, now: Date): void {
    if (this._props.status !== UserStatus.INVITED)
      throw new DomainError(ErrorMessage.INVITE_ALREADY_USED_OR_DISABLED);
    this._props.username = username.trim();
    this._props.passwordHash = passwordHash;
    this._props.status = UserStatus.ACTIVE;
    this._props.isEmailVerified = true;
    this._props.passwordChangedAt = now;
    this.touch(now);
  }

  recordFailedLogin(now: Date): void {
    this._props.failedLoginAttempts += 1;
    if (this._props.failedLoginAttempts >= LOGIN_LOCKOUT.MAX_FAILED_ATTEMPTS) {
      this._props.lockedUntil = new Date(now.getTime() + LOGIN_LOCKOUT.LOCK_MINUTES * 60_000);
      this._props.failedLoginAttempts = 0;
    }
    this.touch(now);
  }

  recordSuccessfulLogin(ip: string | null, now: Date): void {
    this._props.failedLoginAttempts = 0;
    this._props.lockedUntil = null;
    this._props.lastLoginAt = now;
    this._props.lastLoginIp = ip;
    this.touch(now);
  }

  changePassword(newHash: string, now: Date): void {
    this._props.passwordHash = newHash;
    this._props.passwordChangedAt = now;
    this._props.tokenVersion += 1;
    this.touch(now);
  }

  upgradePasswordHash(newHash: string): void {
    this._props.passwordHash = newHash;
  }

  resetPassword(newHash: string, now: Date): void {
    this.changePassword(newHash, now);
    this._props.failedLoginAttempts = 0;
    this._props.lockedUntil = null;
  }

  changeEmail(newEmail: string, now: Date): void {
    this._props.email = normalizeEmail(newEmail);
    this._props.isEmailVerified = true;
    this._props.tokenVersion += 1;
    this.touch(now);
  }

  changeRole(role: UserRole, now: Date): void {
    this._props.role = role;
    this.touch(now);
  }

  disable(now: Date): void {
    if (this._props.status === UserStatus.DISABLED) {
      throw new DomainError(ErrorMessage.USER_ALREADY_DISABLED);
    }
    this._props.status = UserStatus.DISABLED;
    this._props.tokenVersion += 1;
    this.touch(now);
  }

  enable(now: Date): void {
    if (this._props.status !== UserStatus.DISABLED) {
      throw new DomainError(ErrorMessage.USER_NOT_DISABLED);
    }
    this._props.status = this._props.passwordHash ? UserStatus.ACTIVE : UserStatus.INVITED;
    this.touch(now);
  }

  updateProfile(input: { username?: string }, now: Date): void {
    if (input.username !== undefined) this._props.username = input.username.trim();
    this.touch(now);
  }

  private touch(now: Date): void {
    this._props.updatedAt = now;
  }
}
