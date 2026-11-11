import { DomainError } from '../errors/DomainError.ts';
import { ErrorMessage } from '../enums/ErrorMessage.ts';
import type { IOrganizationDetails, SystemSettingsProps } from '../types/system-settings.types.ts';

export class SystemSettings {
  private constructor(private _props: SystemSettingsProps) {}

  static reconstitute(props: SystemSettingsProps): SystemSettings {
    return new SystemSettings({ ...props });
  }

  get isSetupCompleted() {
    return this._props.setupCompleted;
  }
  get setupTokenHash() {
    return this._props.setupTokenHash;
  }
  get setupTokenExpiresAt() {
    return this._props.setupTokenExpiresAt;
  }
  get orgName() {
    return this._props.orgName;
  }
  get baseUrl() {
    return this._props.baseUrl;
  }

  toSnapshot(): Readonly<SystemSettingsProps> {
    return { ...this._props };
  }

  hasLiveSetupToken(now: Date): boolean {
    return (
      this._props.setupTokenHash !== null &&
      this._props.setupTokenExpiresAt !== null &&
      this._props.setupTokenExpiresAt > now
    );
  }

  issueSetupToken(tokenHash: string, expiresAt: Date, now: Date): void {
    this.assertSetupPending();
    this._props.setupTokenHash = tokenHash;
    this._props.setupTokenExpiresAt = expiresAt;
    this.touch(now);
  }

  completeSetup(details: IOrganizationDetails, now: Date): void {
    this.assertSetupPending();
    this._props.setupCompleted = true;
    this._props.setupTokenHash = null;
    this._props.setupTokenExpiresAt = null;
    this._props.orgName = details.orgName;
    this._props.baseUrl = details.baseUrl;
    this.touch(now);
  }

  private assertSetupPending(): void {
    if (this._props.setupCompleted) throw new DomainError(ErrorMessage.SETUP_ALREADY_COMPLETED);
  }

  private touch(now: Date): void {
    this._props.updatedAt = now;
  }
}
